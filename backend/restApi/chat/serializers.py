from rest_framework import serializers
from .models import Chat, ChatMessage, Usage

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]

class ChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chat
        fields = ["id", "title", "created_at"]

    
class ChatDetailSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = ["id", "title", "created_at", "messages"]

class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField()

class UsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usage
        fields = ["messages_used", "messages_limit", "reset_date"]