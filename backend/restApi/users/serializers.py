from rest_framework import serializers
from .models import User
import re


class UserRegisterSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password1', 'password2']

        extra_kwargs = {
                        'password': {'write_only': True},
                        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

                                                                                                                           
    def validate_email(self, value):                                                                                         
        user = self.instance                                                                                                 
        if User.objects.filter(email=value).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError("Email already in use.")
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Invalid email format.")
        return value

    def validate(self, data):
        if data['password1'] != data['password2']:
            raise serializers.ValidationError("The passwords don't match.")

        password = data['password1']
        if len(password) < 8:
            raise serializers.ValidationError("The password must be at least 8 characters.")
        if not any(c.isupper() for c in password):
            raise serializers.ValidationError("The password must have at least one uppercase letter.")
        if not any(c.islower() for c in password):
            raise serializers.ValidationError("The password must have at least one lowercase letter.")

        data['password'] = password
        return data

    def create(self, validated_data):
        validated_data.pop('password1')
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate_email(self, value):
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk if user else None).exists():
            raise serializers.ValidationError("Email already in use.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
