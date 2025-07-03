from django.views.generic import ListView
from core.models.restaurant_model import Restaurant
from core.selectors.restaurant_filter_selector import RestaurantFilterOptions, RestaurantFilterSelector

class RestaurantListView(ListView):
    """List all restaurants"""
    model = Restaurant
    template_name = 'core/restaurant_list.html'
    context_object_name = 'restaurants'
    
    def get_queryset(self):
        filter_options = RestaurantFilterOptions(search=self.request.GET.get('search'))
        restaurants_selector = RestaurantFilterSelector(options=filter_options)
        return restaurants_selector.get_restaurants()
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Find Your Favorite Restaurants'
        return context
