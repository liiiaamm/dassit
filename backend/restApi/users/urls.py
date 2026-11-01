from django.urls import path
from .views import (
    UserRegisterView,
    UserProfileView,
    ChangePasswordView,
    UserListView,
    UserRetrieveUpdateDestroyView,
    LogoutView,
    EmailLoginView,
)

app_name = "users"

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='user-register'),
    path('login/', EmailLoginView.as_view(), name='email-login'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('log-out/', LogoutView.as_view(), name='log-out'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserRetrieveUpdateDestroyView.as_view(), name='user-detail'),
]
