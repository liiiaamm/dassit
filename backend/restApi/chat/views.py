from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from datetime import timedelta
from ai.llm_service import call_llm

from .models import Chat, ChatMessage, Usage
from .serializers import ChatSerializer, ChatMessageSerializer, ChatDetailSerializer, SendMessageSerializer, UsageSerializer
from .permissions import IsChatOwner


class UsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usage = get_object_or_404(Usage, user=request.user)
        serializer = UsageSerializer(usage)
        return Response(serializer.data)

class ChatListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        chats = Chat.objects.filter(user=request.user)
        serializer = ChatSerializer(chats, many=True)
        return Response(serializer.data)

    def post(self, request):
        title = request.data.get("title", "New Chat")

        chat = Chat.objects.create(
            user=request.user,
            title=title
        )

        serializer = ChatSerializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatDetailView(APIView):
    permission_classes = [IsAuthenticated, IsChatOwner]

    def get(self, request, chat_id):
        chat = get_object_or_404(Chat, pk=chat_id)
        self.check_object_permissions(request, chat)

        serializer = ChatDetailSerializer(chat)
        return Response(serializer.data)

    def delete(self, request, chat_id):
        chat = get_object_or_404(Chat, pk=chat_id)
        self.check_object_permissions(request, chat)
        chat.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated, IsChatOwner]

    def post(self, request, chat_id):
        chat = get_object_or_404(Chat, pk=chat_id)
        self.check_object_permissions(request, chat)

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]

        usage = get_object_or_404(Usage, user=request.user)

        now = timezone.now()
        if usage.reset_date and now > usage.reset_date:
            usage.messages_used = 0
            usage.reset_date = now + timedelta(days=30)
            usage.save()

        if usage.messages_used >= usage.messages_limit:
            return Response(
                {"detail": "Monthly message limit reached."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ChatMessage.objects.create(chat=chat, role="user", content=content)

        history = [
            {"role": msg.role, "content": msg.content}
            for msg in chat.messages.all()
        ]

        reply = call_llm(history)

        ChatMessage.objects.create(chat=chat, role="assistant", content=reply)

        usage.messages_used += 1
        usage.save()

        return Response(
            {"reply": reply, "messages_used": usage.messages_used, "messages_limit": usage.messages_limit},
            status=status.HTTP_200_OK,
        )
