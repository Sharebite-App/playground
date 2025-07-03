from django.views.generic import DetailView
from core.models.restaurant_model import Restaurant


class RestaurantDetailView(DetailView):
    """Show restaurant details and sections"""
    model = Restaurant
    template_name = 'core/restaurant_detail.html'
    context_object_name = 'restaurant'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['sections'] = self.object.section_set.filter(archive_status=False)
        return context
