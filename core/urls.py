from django.urls import path
from django.contrib.auth import views as auth_views
from core.views import HomeView, RegisterView, RestaurantListView, RestaurantDetailView, SectionDetailView

urlpatterns = [
    path('', HomeView.as_view(), name='home'),
    path('restaurants/', RestaurantListView.as_view(), name='restaurant_list'),
    path('restaurant/<int:pk>/', RestaurantDetailView.as_view(), name='restaurant_detail'),
    path('restaurant/<int:restaurant_pk>/section/<int:pk>/', SectionDetailView.as_view(), name='section_detail'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', auth_views.LoginView.as_view(template_name='core/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
]