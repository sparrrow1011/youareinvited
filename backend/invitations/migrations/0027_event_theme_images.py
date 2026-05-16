from django.db import migrations, models
import invitations.models


def _column_names(schema_editor, table_name):
    with schema_editor.connection.cursor() as cursor:
        description = schema_editor.connection.introspection.get_table_description(
            cursor,
            table_name,
        )
    return {getattr(column, 'name', column[0]) for column in description}


def _image_field(name, upload_to):
    field = models.ImageField(blank=True, null=True, upload_to=upload_to)
    field.set_attributes_from_name(name)
    return field


def _add_event_image_field(apps, schema_editor, name, upload_to):
    if name in _column_names(schema_editor, 'invitations_event'):
        return
    event_model = apps.get_model('invitations', 'Event')
    schema_editor.add_field(event_model, _image_field(name, upload_to))


def _remove_event_image_field(apps, schema_editor, name, upload_to):
    if name not in _column_names(schema_editor, 'invitations_event'):
        return
    event_model = apps.get_model('invitations', 'Event')
    schema_editor.remove_field(event_model, _image_field(name, upload_to))


def add_theme_hero_image(apps, schema_editor):
    _add_event_image_field(
        apps,
        schema_editor,
        'theme_hero_image',
        invitations.models.event_theme_hero_path,
    )


def remove_theme_hero_image(apps, schema_editor):
    _remove_event_image_field(
        apps,
        schema_editor,
        'theme_hero_image',
        invitations.models.event_theme_hero_path,
    )


def add_theme_secondary_image(apps, schema_editor):
    _add_event_image_field(
        apps,
        schema_editor,
        'theme_secondary_image',
        invitations.models.event_theme_secondary_path,
    )


def remove_theme_secondary_image(apps, schema_editor):
    _remove_event_image_field(
        apps,
        schema_editor,
        'theme_secondary_image',
        invitations.models.event_theme_secondary_path,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('invitations', '0026_eventgiftlink'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_theme_hero_image, remove_theme_hero_image),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='event',
                    name='theme_hero_image',
                    field=models.ImageField(
                        blank=True,
                        null=True,
                        upload_to=invitations.models.event_theme_hero_path,
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_theme_secondary_image,
                    remove_theme_secondary_image,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='event',
                    name='theme_secondary_image',
                    field=models.ImageField(
                        blank=True,
                        null=True,
                        upload_to=invitations.models.event_theme_secondary_path,
                    ),
                ),
            ],
        ),
    ]
