from django.views.generic import DetailView
from core.models.section_model import Section


class SectionDetailView(DetailView):
    """Show section details and items"""
    model = Section
    template_name = 'core/section_detail.html'
    context_object_name = 'section'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['items'] = self.object.item_set.filter(is_active=True, archive_status=False)
        context['restaurant'] = self.object.restaurant
        return context
