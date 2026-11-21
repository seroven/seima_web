# SEIMA (Android)

App de Luis para publicar proyectos y atender cotizaciones. Solo Android, paquete `pe.seima.app`. No se conecta a la base de datos: habla con la API.

## Preparar

1. Copia `app/.env.example` a `app/.env`.
2. `API_URL` apunta a la API. En el emulador, `http://10.0.2.2:4000/api/v1` es tu computadora. En un celular real, usa la IP de la computadora (el tráfico sin cifrar solo está permitido en depuración).
3. Las variables `FIREBASE_*` salen de la app Android en Firebase. Si las dejas vacías, se puede entrar igual y no hay avisos.

Flutter está en `C:\Users\Sebastian\fvm\versions\stable` (o el `flutter` del PATH).

```
cd app
flutter pub get
flutter test
flutter run
```

Usuario de desarrollo: `luis`. La contraseña es la del seed de la API.
