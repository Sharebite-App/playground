from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login


def home(request):
    """Home page view"""
    posts = []
    context = {
        'posts': posts,
        'title': 'Welcome to Django'
    }
    return render(request, 'core/home.html', context)


def register(request):
    """User registration view"""
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully!')
            return redirect('home')
    else:
        form = UserCreationForm()
    
    context = {
        'form': form,
        'title': 'Register'
    }
    return render(request, 'core/register.html', context) 