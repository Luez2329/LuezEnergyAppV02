# LuezEnergyAppV02

Copia independiente de la aplicación de evaluación energética LuezEnergyApp, creada a partir de la versión publicada el 14 de noviembre de 2026. La interfaz V02 está dedicada a la tarifa BT5B y a la comparación del suministro AC con la generación fotovoltaica.

V02 utiliza un almacenamiento local separado del de la aplicación original. Los recibos y las curvas cargados en una versión no aparecen automáticamente en la otra.

## Escenarios de diseño

- **A:** paneles necesarios para igualar el pico AC de diseño, si caben en el área útil.
- **B:** potencia FV limitada por el área, cuando no caben los paneles de A.
- **C1:** paneles con excedente solar, baterías adicionales para desplazar consumo y reserva protegida de seis horas. Si las baterías existentes no alcanzan esa reserva, se incluyen baterías nuevas para completarla.
- **C2:** mismos paneles de C1 y uso de las baterías existentes. Se muestra la autonomía mínima simulada como advertencia.

La aplicación calcula energía y ahorro con las curvas AC y FV alineadas, y anualiza una muestra de al menos 300 días. El retorno es `inversión inicial / ahorro neto anual`; la meta es menos de tres años. Para validar el diseño final se necesita confirmar la carga real de la barra DC, la capacidad del convertidor, el estado de salud de las baterías y los costos y cargos del recibo BT5B.

Prueba de las reglas de escenarios: `node tests/scenarios-v02.test.cjs`.

La aplicación estática se encuentra en `dist/`. Abra `dist/index.html` o use `Abrir aplicacion.cmd` en Windows. El flujo de GitHub Pages incluido en `.github/workflows/deploy-pages.yml` publica el contenido de `dist/` cuando se configura un repositorio remoto y se envía la rama `main`.

Repositorio de origen: https://github.com/Luez2329/LuezEneryApp
