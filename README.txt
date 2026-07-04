Sardegna Explorer PWA

COSA CONTIENE
- PWA privata installabile su iPhone/Android.
- 117 pin della Sardegna orientale.
- Mappa interna gratuita con OpenStreetMap/Leaflet.
- Integrazione Google Maps tramite pulsanti:
  - Vedi su Google Maps
  - Apri navigazione Google Maps
- Meteo e vento live con Open-Meteo, senza API key.
- Motore “AI” locale: vento, obiettivo, camminata, affollamento, preferiti, local/segreti.
- Preferiti, visitati e note personali salvati sul dispositivo.

COME APRIRLA SUBITO
1. Decomprimi lo ZIP.
2. Apri index.html da computer per provarla.
   Nota: meteo/geolocalizzazione/service worker funzionano meglio pubblicandola online.

COME PUBBLICARLA GRATIS COME PWA
Metodo più facile: GitHub Pages
1. Crea un account GitHub, se non ce l'hai.
2. Crea un nuovo repository, per esempio: sardegna-explorer.
3. Carica tutti i file contenuti in questa cartella.
4. Vai su Settings > Pages.
5. Source: Deploy from branch.
6. Branch: main / root.
7. Dopo qualche minuto avrai un link tipo:
   https://tuonome.github.io/sardegna-explorer/

COME INSTALLARLA SU IPHONE
1. Apri il link con Safari.
2. Tocca Condividi.
3. Tocca “Aggiungi alla schermata Home”.
4. Avrai l’icona Sardegna Explorer come fosse un’app.

GOOGLE MAPS
La mappa interna usa OpenStreetMap per non chiederti una API key.
I pulsanti Google Maps usano Maps URLs: non serve chiave e aprono direttamente l’app Google Maps.

METEO
Open-Meteo non richiede API key. Serve internet per meteo live.

AGGIORNARE I LUOGHI
Il file data.js contiene tutti i pin. Possiamo rigenerarlo quando aggiungiamo nuovi posti.
