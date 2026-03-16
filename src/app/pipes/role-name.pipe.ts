import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roleName',
  standalone: true
})
export class RoleNamePipe implements PipeTransform {
  private roleTranslations: { [key: string]: string } = {
    'ROLE_SUPER_ADMIN': 'Super Administrador',
    'ROLE_ADMIN': 'Administrador',
    'ROLE_MODERATOR': 'Moderador',
    'ROLE_MANAGER': 'Gerente',
    'ROLE_STAFF': 'Personal',
    'ROLE_SALES': 'Ventas',
    'ROLE_INVENTORY': 'Inventario',
    'ROLE_SUPPORT': 'Soporte',
    'ROLE_USER': 'Usuario' // Aunque se filtrará, por si acaso
  };

  transform(roleName: string | undefined | null): string {
    if (!roleName) {
      return 'Sin nombre';
    }

    // Si ya está en el diccionario, retornar traducción
    if (this.roleTranslations[roleName]) {
      return this.roleTranslations[roleName];
    }

    // Si tiene el prefijo ROLE_, quitarlo y capitalizar
    if (roleName.startsWith('ROLE_')) {
      const withoutPrefix = roleName.replace('ROLE_', '');
      return this.capitalize(withoutPrefix);
    }

    // Si no tiene prefijo, simplemente capitalizar
    return this.capitalize(roleName);
  }

  private capitalize(text: string): string {
    return text
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
