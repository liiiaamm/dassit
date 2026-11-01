from django.db import models
from django.conf import settings
# Create your models here.

class Usage(models.Model):
    messages_used = models.IntegerField(default=0)
    messages_limit = models.IntegerField(default=100)
    reset_date = models.DateTimeField()
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    def __str__(self):
        return f"{self.user}: {self.messages_used}"

class Chat(models.Model):
    title = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats")

    def __str__(self):
        return f"{self.user}: {self.title}"
    
class ChatMessage(models.Model):
    possible_roles = [("system", "System"), ("user", "User"), ("assistant", "Assistant")]
    role = models.CharField(max_length=50, choices=possible_roles)
    content = models.TextField()
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
    
    def __str__(self):
        return f"{self.role}: {self.content[:30]}"
