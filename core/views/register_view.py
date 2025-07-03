from django.views.generic import FormView
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.contrib import messages
from django.urls import reverse_lazy


class RegisterView(FormView):
    """User registration view using FormView"""
    template_name = 'core/register.html'
    form_class = UserCreationForm
    success_url = reverse_lazy('home')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Register'
        return context
    
    def form_valid(self, form):
        """Handle valid form submission"""
        user = form.save()
        login(self.request, user)
        messages.success(self.request, 'Account created successfully!')
        return super().form_valid(form)