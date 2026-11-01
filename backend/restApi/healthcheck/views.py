from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthcheckView(APIView):
    @extend_schema(
        description="Healthcheck endpoint",
        responses={200: "API is running"},
    )
    def get(self, request):
        return Response("Greetings from API Chat AI (DAS 2026)")
