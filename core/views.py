from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from .models import Restaurant, Section, Item


def home(request):
    """Home page view - Restaurant listing"""
    restaurants = Restaurant.objects.filter(archive_status=False).order_by('name')
    context = {
        'restaurants': restaurants,
        'title': 'Sharebite LITE - Find Your Favorite Restaurants'
    }
    return render(request, 'core/home.html', context)


def restaurant_detail(request, restaurant_id):
    """Restaurant detail view - Show sections"""
    restaurant = get_object_or_404(Restaurant, id=restaurant_id, archive_status=False)
    sections = Section.objects.filter(restaurant=restaurant, archive_status=False).order_by('name')
    
    context = {
        'restaurant': restaurant,
        'sections': sections,
        'title': f'{restaurant.name} - Menu'
    }
    return render(request, 'core/restaurant_detail.html', context)


def section_detail(request, restaurant_id, section_id):
    """Section detail view - Show items"""
    restaurant = get_object_or_404(Restaurant, id=restaurant_id, archive_status=False)
    section = get_object_or_404(Section, id=section_id, restaurant=restaurant, archive_status=False)
    items = Item.objects.filter(section=section, is_active=True, archive_status=False).order_by('name')
    
    context = {
        'restaurant': restaurant,
        'section': section,
        'items': items,
        'title': f'{section.name} - {restaurant.name}'
    }
    return render(request, 'core/section_detail.html', context)


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