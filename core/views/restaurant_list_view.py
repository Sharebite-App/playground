from django.views.generic import ListView
from core.models.restaurant_model import Restaurant

class RestaurantListView(ListView):
    """List all restaurants"""
    model = Restaurant
    template_name = 'core/restaurant_list.html'
    context_object_name = 'restaurants'
    
    def get_queryset(self):
        return Restaurant.objects.filter(archive_status=False).order_by('name')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Find Your Favorite Restaurants'
        return context
