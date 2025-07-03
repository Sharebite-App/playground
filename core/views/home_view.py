from django.views.generic import TemplateView


class HomeView(TemplateView):
    """Home page view - Basic landing page"""
    template_name = 'core/home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Sharebite LITE - Food Ordering Made Simple'
        return context