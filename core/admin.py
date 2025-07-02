from django.contrib import admin
from .models import Restaurant, Section, Item


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'phone', 'created_at')
    list_filter = ('city', 'state', 'archive_status')
    search_fields = ('name', 'address', 'city')
    date_hierarchy = 'created_at'


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'restaurant', 'created_at')
    list_filter = ('restaurant', 'archive_status')
    search_fields = ('name', 'description', 'restaurant__name')


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'section', 'restaurant', 'price', 'is_active')
    list_filter = ('section__restaurant', 'is_active', 'archive_status')
    search_fields = ('name', 'description', 'section__name', 'section__restaurant__name')
    
    def restaurant(self, obj):
        return obj.section.restaurant.name
    restaurant.short_description = 'Restaurant'