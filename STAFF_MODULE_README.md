# Módulo de Gestión de Staff y Roles - Frontend

## Instalación de Dependencias

Ejecuta el siguiente comando en la carpeta `frontend`:

```bash
npm install sweetalert2 bootstrap-icons
```

## Configuración de Rutas

Agrega las siguientes rutas en tu archivo `app.routes.ts`:

```typescript
import { Routes } from "@angular/router";
import { AdminStaffComponent } from "./components/admin/admin-staff/admin-staff.component";
import { AdminRolesComponent } from "./components/admin/admin-roles/admin-roles.component";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  // ... tus rutas existentes

  // Rutas de Admin - Staff y Roles
  {
    path: "admin/staff",
    component: AdminStaffComponent,
    canActivate: [AuthGuard],
    data: { roles: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"] },
  },
  {
    path: "admin/roles",
    component: AdminRolesComponent,
    canActivate: [AuthGuard],
    data: { roles: ["ROLE_ADMIN", "ROLE_SUPER_ADMIN"] },
  },

  // ... más rutas
];
```

## Configuración del Environment

Asegúrate de que tu archivo `environment.ts` tenga configurada la URL del API:

```typescript
export const environment = {
  production: false,
  apiUrl: "http://localhost:8080/api", // Ajusta según tu configuración
};
```

## Estructura de Archivos Creados

```
frontend/src/app/
├── models/
│   └── staff.model.ts                    # Interfaces y tipos
├── services/
│   ├── staff.service.ts                  # Servicio de Staff
│   └── role.service.ts                   # Servicio de Roles
└── components/
    └── admin/
        ├── admin-staff/
        │   ├── admin-staff.component.ts
        │   ├── admin-staff.component.html
        │   ├── admin-staff.component.css
        │   ├── staff-form-modal.component.ts
        │   ├── staff-form-modal.component.html
        │   └── staff-form-modal.component.css
        └── admin-roles/
            ├── admin-roles.component.ts
            ├── admin-roles.component.html
            └── admin-roles.component.css
```

## Características Implementadas

### Gestión de Staff (`/admin/staff`)

- ✅ Tabla responsiva con paginación
- ✅ Búsqueda y filtros avanzados (rol, estado, bloqueo)
- ✅ Toggle switch para activar/desactivar usuarios
- ✅ Botón para bloquear/desbloquear cuentas
- ✅ Visualización de roles con badges
- ✅ Contador de intentos fallidos de login con reset
- ✅ Modal de creación/edición con formulario reactivo
- ✅ Selección múltiple de roles con tarjetas interactivas
- ✅ Validación de formularios en tiempo real
- ✅ Exportar lista a CSV
- ✅ Eliminación de usuarios con confirmación

### Gestión de Roles y Permisos (`/admin/roles`)

- ✅ Vista en tarjetas (cards) de roles
- ✅ Estadísticas: cantidad de permisos y usuarios por rol
- ✅ Modal de permisos con categorías colapsables
- ✅ Permisos agrupados por categoría (USER_MANAGEMENT, PRODUCT_MANAGEMENT, etc.)
- ✅ Selección individual y por categoría completa
- ✅ Checkbox indeterminado cuando categoría parcialmente seleccionada
- ✅ Modal de crear/editar roles
- ✅ Eliminación de roles con confirmación
- ✅ Iconos dinámicos por categoría

## Integración con el Backend

Los servicios están configurados para conectarse a los siguientes endpoints:

### AdminUserController

- `GET /api/admin/users` - Lista de usuarios con paginación y filtros
- `GET /api/admin/users/{id}` - Detalle de usuario
- `POST /api/admin/users` - Crear usuario
- `PUT /api/admin/users/{id}` - Actualizar usuario
- `DELETE /api/admin/users/{id}` - Eliminar usuario
- `PATCH /api/admin/users/{id}/enable` - Activar usuario
- `PATCH /api/admin/users/{id}/disable` - Desactivar usuario
- `PATCH /api/admin/users/{id}/lock` - Bloquear cuenta
- `PATCH /api/admin/users/{id}/unlock` - Desbloquear cuenta
- `PUT /api/admin/users/{id}/roles` - Asignar roles
- `DELETE /api/admin/users/{id}/roles` - Remover roles
- `PATCH /api/admin/users/{id}/reset-failed-attempts` - Resetear intentos
- `GET /api/admin/users/export/csv` - Exportar a CSV

### AdminRoleController

- `GET /api/admin/roles` - Lista de roles
- `GET /api/admin/roles/{id}` - Detalle de rol con permisos
- `POST /api/admin/roles` - Crear rol
- `PUT /api/admin/roles/{id}` - Actualizar rol
- `DELETE /api/admin/roles/{id}` - Eliminar rol
- `GET /api/admin/roles/permissions` - Lista de todos los permisos
- `POST /api/admin/roles/{id}/permissions` - Asignar permisos
- `DELETE /api/admin/roles/{id}/permissions` - Remover permisos
- `GET /api/admin/roles/search` - Buscar roles
- `GET /api/admin/roles/{id}/stats` - Estadísticas de rol

## Diseño

- **Paleta de colores**: Tinto (#800020) y Dorado (#D4A347)
- **Framework**: Bootstrap 5
- **Iconos**: Bootstrap Icons
- **Notificaciones**: SweetAlert2
- **Responsive**: Completamente adaptable a móviles

## Notas de Desarrollo

1. El componente `StaffFormModalComponent` está embebido dentro de `AdminStaffComponent`
2. Los modales usan `ngIf` para montarse/desmontarse del DOM
3. Los servicios usan `Observable` de RxJS
4. Los formularios usan `ReactiveFormsModule` para mejor control de validación
5. La paginación está implementada del lado del servidor
6. Los permisos se agrupan automáticamente por la categoría definida en la BD

## Testing

Para probar el módulo:

1. Inicia el backend en `http://localhost:8080`
2. Inicia el frontend con `ng serve`
3. Navega a `http://localhost:4200/admin/staff` o `/admin/roles`
4. Asegúrate de estar autenticado con un usuario ADMIN

## Próximos Pasos (Opcional)

- Agregar filtros avanzados por fecha de creación
- Implementar historial de cambios de permisos
- Agregar gráficos de uso de permisos
- Implementar búsqueda en tiempo real (debounce)
- Agregar exportación a Excel/PDF
- Implementar drag & drop para reordenar roles
