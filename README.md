# Frontend Deployment - Angular Application

Este directorio contiene la aplicación Angular del sistema de autenticación.

## Configuración para Railway

### Archivos de configuración:

- `Dockerfile` - Configuración Docker para build y deployment
- `nginx.conf` - Configuración de servidor web Nginx
- `railway.json` - Configuración específica de Railway
- `src/environments/environment.prod.ts` - Variables de entorno para producción

### Backend URL configurada:

- **Producción**: `https://backendapp-production-ce23.up.railway.app/api`
- **Desarrollo**: `http://localhost:8080/api`

### Build verificado:

✅ Build de producción completado exitosamente
✅ Archivos generados en `dist/frontend/browser/`
✅ Configuración Nginx lista para SPA routing
✅ Dockerfile configurado para deployment


### Servicios configurados:

- **AuthService**: Conectado al backend en Railway
- **SmsService**: Configurado para 2FA SMS
- **PasswordResetService**: Para recuperación de contraseñas
- **GoogleAuthService**: Para autenticación Google

### Funcionalidades incluidas:

- ✅ Sistema de login/registro
- ✅ Verificación de email
- ✅ Autenticación de dos factores (SMS, Email, Google Authenticator)
- ✅ Recuperación de contraseñas
- ✅ Dashboard de usuario
- ✅ Gestión de autenticación Google
- ✅ Manejo de sesiones JWT

---

## Angular CLI Information

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.1.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
