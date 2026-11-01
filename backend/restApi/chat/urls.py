from django.urls import path
from .views import ChatListCreateView, ChatDetailView, SendMessageView, UsageView

urlpatterns = [
    path("", ChatListCreateView.as_view()),
    path("usage/", UsageView.as_view()),
    path("<int:chat_id>/", ChatDetailView.as_view()),
    path("<int:chat_id>/send/", SendMessageView.as_view()),
]
