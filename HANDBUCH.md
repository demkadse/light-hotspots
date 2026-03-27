# Benutzerhandbuch

## Light Hotspots Kalender und Discord-Bot

Dieses Handbuch richtet sich an normale Nutzerinnen und Nutzer des Light Hotspots Kalenders und des dazugehoerigen Discord-Bots. Es erklaert:

- alle sichtbaren Bereiche und Funktionen der Kalender-Website
- den kompletten Nutzerablauf zum Erstellen, Bearbeiten und Absagen eines Events ueber Discord

Nicht behandelt werden:

- Admin-Funktionen
- interne Moderationsablaeufe
- Slash-Befehle fuer Team oder Verwaltung

## 1. Wofuer der Kalender gedacht ist

Der Light Hotspots Kalender ist eine Uebersichtsseite fuer Rollenspiel-Events auf dem Light-Datenzentrum. Er soll Nutzern helfen,

- aktuelle und kommende Events schnell zu finden
- nach bestimmten Arten von Events zu filtern
- sich alle wichtigen Informationen zu einer Veranstaltung auf einen Blick anzusehen
- ueber Discord eigene Events einzureichen

Die Website dient in erster Linie der Darstellung. Das Erstellen und Bearbeiten von Events erfolgt ueber den Discord-Bot auf dem zugehoerigen Discord-Server.

## 2. Aufbau der Website

Die Kalender-Website besteht aus mehreren klaren Bereichen:

1. Kopfbereich mit Titel, Fokus-Info und Link zum Discord-Server
2. Filter- und Navigationsbereich
3. Monats- beziehungsweise Tagesansicht mit Event-Karten
4. Detailansicht pro Event
5. Fussbereich mit Zusatzinformationen

## 3. Der Kopfbereich der Website

Ganz oben auf der Seite sehen Nutzer:

- den Titel des Kalenders
- einen kurzen Einleitungstext
- einen auffaelligen Button zum Discord-Server
- einen kleinen Fokusbereich fuer den aktuell relevanten Tag oder ein hervorgehobenes Event

### 3.1 Der Discord-Button

Der Button im Kopfbereich fuehrt direkt zum Discord-Server. Dort erfolgt die eigentliche Event-Erstellung ueber den Bot.

Typischer Zweck dieses Buttons:

- dem Server beitreten
- ein Event einreichen
- ein bestehendes Event bearbeiten
- ein veroefentlichtes Event absagen

### 3.2 Der Fokusbereich

Der Fokusbereich zeigt:

- den aktuell aktiven Tag
- eine kurze Einordnung, wie viele sichtbare Events an diesem Tag vorhanden sind
- wenn vorhanden: ein hervorgehobenes Event aus der aktuellen Woche

Wenn fuer die laufende Woche kein geeignetes Event vorliegt, erscheint dort stattdessen ein neutraler Hinweis.

## 4. Filter und Navigation auf der Website

Unter dem Kopfbereich beginnt die eigentliche Kalendersteuerung.

### 4.1 Zeitfenster

Es gibt drei Schaltflaechen fuer das Zeitfenster:

- `Alle Tage`
- `Heute`
- `Wochenende`

Damit koennen Nutzer die gesamte Monatsansicht, nur den heutigen Tag oder nur Wochenendtage anzeigen lassen.

### 4.2 Schnellnavigation

Der Kalender bietet zusaetzliche Schnellziele, zum Beispiel:

- `Morgen`
- `Monatsanfang`
- `Erstes Event`

Diese Schnellnavigation hilft dabei, mit einem Klick zu relevanten Stellen im Monat zu springen.

### 4.3 Typ-Filter

Ueber den Typ-Filter koennen Nutzer gezielt nach Eventarten filtern. Je nach eingetragenen Daten kann das zum Beispiel sein:

- Taverne
- Club
- Markt
- Restaurant
- Badehaus

Zusatzlich gibt es kleine Schnellfilter-Chips fuer haeufige Typen.

### 4.4 Venue-Filter

Ueber den Venue-Filter kann die Anzeige auf einen bestimmten Ort oder eine bestimmte Location beschraenkt werden.

### 4.5 Kategorien: Events und Venues

Der Kalender unterscheidet zwei Hauptgruppen:

- `Events`
- `Venues`

Nutzer koennen:

- nur Events anzeigen
- nur Venues anzeigen
- beide gleichzeitig anzeigen

Falls beide deaktiviert werden wuerden, setzt der Kalender automatisch mindestens eine sichtbare Kategorie zurueck, damit die Seite nie leer durch einen ungueltigen Zustand wird.

### 4.6 Zustandsmerker

Der Kalender merkt sich den zuletzt genutzten Zustand, darunter:

- gewaehltes Zeitfenster
- gewaehlter Typ
- gewaehlte Venue
- aktivierte Kategorien
- letzter aktiver Tag

Das bedeutet: Beim erneuten Oeffnen erscheint die Seite in vielen Faellen wieder in der zuletzt benutzten Ansicht.

## 5. Die Monats- und Tagesansicht

Der Hauptbereich des Kalenders zeigt die Tage des aktuellen Monats.

Jeder Tag hat:

- einen Marker wie `Heute`, `Morgen`, `Wochenende` oder `Diese Woche`
- das voll ausgeschriebene Datum
- eine kurze Unterzeile mit der Anzahl sichtbarer Events
- die Event-Karten des Tages

Wenn an einem Tag keine Events sichtbar sind, bleibt der Tag trotzdem Teil der Navigation.

## 6. Event-Karten

Ein Tag kann eine oder mehrere Event-Karten enthalten. Diese Karten sind die kompakte Schnellansicht eines Events.

### 6.1 Was auf einer Event-Karte steht

Eine Karte kann unter anderem enthalten:

- Bannerbild oder Platzhalterbild
- Titel des Events
- Kategorie
- Typ
- Uhrzeit
- Venue
- Server
- Projektleitung
- kurze Beschreibung
- Hinweise darauf, ob ein Discord-Link oder externer Link vorhanden ist

### 6.2 Banner und Platzhalter

Wenn beim Event ein eigenes Banner hinterlegt wurde, zeigt die Karte dieses Bild an.

Wenn kein Banner vorhanden ist, wird automatisch ein festes Platzhalterbild verwendet. Dadurch sehen auch Events ohne eigenes Bild vollstaendig und sauber aus.

### 6.3 Mehrere Events an einem Tag

Wenn an einem Tag mehrere Events eingetragen sind, werden sie in einer verschiebbaren oder scrollbaren Darstellung gezeigt. Auf Desktop und Mobilgeraeten ist die Darstellung so ausgelegt, dass Nutzer bequem zwischen mehreren Karten wechseln koennen.

### 6.4 Abgesagte Events

Wenn ein Event abgesagt wurde, bleibt es sichtbar, wird aber deutlich als abgesagt markiert. Das ist wichtig, damit Besucher nicht denken, das Event sei einfach verschwunden.

## 7. Detailansicht eines Events

Beim Anklicken einer Event-Karte oeffnet sich ein Detailfenster.

### 7.1 Inhalte der Detailansicht

Dort koennen Nutzer alle verfuegbaren Informationen sehen:

- grosses Bannerbild oder Platzhalterbild
- Titel
- Kategorie
- Typ
- Datum und Uhrzeit
- Venue
- Server
- Projektleitung
- Wiederholungsinformation
- Beschreibung
- Hinweise
- Status bei abgesagten Events

### 7.2 Links in der Detailansicht

Wenn vorhanden, erscheinen Schaltflaechen fuer:

- Discord-Server des Events
- externe Webseiten oder Zusatzinfos

So kann der Nutzer direkt weiterklicken, ohne erst lange suchen zu muessen.

### 7.3 Weitere Events am selben Abend

Das Detailfenster kann ausserdem weitere passende Veranstaltungen desselben Abends anzeigen. Diese Vorschlaege sind direkt anklickbar und helfen beim schnellen Wechsel zwischen mehreren Events desselben Tages.

## 8. Zusatzbereiche im Fuss der Website

Im unteren Bereich der Website befinden sich weitere Informationsdialoge.

### 8.1 Rechtshinweis

Hier stehen Hinweise zur Plattform, zur konkreten Gestaltung und zu urheberrechtlichen Aspekten.

### 8.2 Transparenz

Hier wird offengelegt, dass fuer die technische Umsetzung KI-Unterstuetzung verwendet wurde.

### 8.3 Hinweis zu Events und Venues

Ein zusaetzlicher Infodialog erklaert den Unterschied zwischen klassischen Events und Venues, damit Nutzer die Kategorisierung besser verstehen.

### 8.4 Datenschutzerklaerung

Die Website bietet ausserdem eine eigene Datenschutzerklaerung sowie einen Erstbesuch-Hinweis, der erklaert, welche Daten gespeichert werden und warum aktuell keine klassische Cookie-Abfrage verwendet wird.

## 9. Mobile Nutzung

Der Kalender ist auch fuer Mobilgeraete ausgelegt.

Wichtige Punkte dabei:

- Karten bleiben gut lesbar
- Tageswechsel funktioniert auch auf kleineren Bildschirmen
- Event-Details sind ueber das Modal gut erreichbar
- Filter bleiben direkt bedienbar

## 10. Der Discord-Bot fuer Nutzer

Die Website dient der Anzeige. Alles, was mit dem Anlegen oder Pflegen eigener Events zu tun hat, geschieht ueber den Discord-Bot.

Nutzer sehen auf dem Discord-Server ein Event-System mit einer Start-Schaltflaeche. Ueber diesen Einstieg beginnt der Event-Ablauf.

## 11. Start des Event-Prozesses im Discord

Im Discord-Server gibt es ein Event-Panel mit einer Start-Schaltflaeche.

Nach dem Klick auf `Start` stehen fuer normale Nutzer typischerweise drei Wege offen:

- `Neues Event erstellen`
- `Bestehendes Event bearbeiten`
- `Veröffentlichtes Event absagen`

Damit deckt der Bot den kompletten normalen Nutzerprozess ab.

## 12. Neues Event erstellen

Die Event-Erstellung ist als klarer 3-Schritte-Ablauf aufgebaut.

### 12.1 Schritt 1 von 3: Basisdaten

Im ersten Formular werden die Pflichtangaben abgefragt:

- Titel
- Location
- Datum
- Uhrzeit
- Beschreibung

#### Wichtige Formatregeln

- Das Datum muss im Format `TT.MM.JJJJ` eingegeben werden.
- Die Uhrzeit muss im Format `HH:MM` eingegeben werden.

Ohne diese Angaben kann das Event nicht gespeichert werden.

### 12.2 Schritt 2 von 3: Auswahlmenues

Nach den Basisdaten fuehrt der Bot durch klare Dropdown-Menues. Dort werden die vordefinierten Angaben ausgewaehlt, damit Nutzer so wenig wie moeglich frei tippen muessen.

Moegliche Angaben:

- Kategorie `Event` oder `Venue`
- Typ passend zur Kategorie
- Server
- Wiederholung

Wichtig:

- Die Einordnung als `Event` oder `Venue` wird aktiv vom Nutzer ausgewaehlt.
- `Kategorie`, `Typ` und `Server` muessen vor der Einreichung gesetzt sein.

### 12.3 Schritt 3 von 3: Zusatzangaben

Im dritten Schritt koennen weitere optionale Informationen hinterlegt werden:

- Endzeit
- Projektleitung
- Bild-URL
- Discord-Link
- externer Link
- Hinweise

#### Regeln fuer Extras

- Die Bild-URL muss mit `http://` oder `https://` beginnen und auf eine Bilddatei zeigen.
- Der Discord-Link muss auf `discord.gg` oder `discord.com` verweisen.
- Falls eine Endzeit eingetragen wird, muss sie im Format `HH:MM` angegeben werden.

### 12.4 Vorschau nach jedem Schritt

Nach jedem Schritt zeigt der Bot eine Vorschau des aktuellen Events.

Diese Vorschau hilft dabei:

- Eingaben zu kontrollieren
- fehlende Informationen zu erkennen
- vor dem Absenden noch Korrekturen vorzunehmen

Zwischen den Schritten kann man gezielt wieder zu `Details` oder `Extras` zurueckspringen und Dinge aendern.

### 12.5 Zur Pruefung senden

Wenn alle gewuenschten Angaben eingetragen wurden, kann das Event ueber die entsprechende Schaltflaeche zur Pruefung gesendet werden.

Ab diesem Punkt:

- bekommt das Event den Status `pending`
- wird es intern zur Freigabe weitergegeben
- erhaelt der Nutzer eine Rueckmeldung, dass die Einreichung eingegangen ist

Falls der Server noch fehlt, verweigert der Bot die Einreichung mit einem Hinweis, dass dieser zuerst nachgetragen werden muss.

## 13. Was nach dem Einreichen passiert

Nach dem Absenden wird das Event intern geprueft.

Fuer Nutzer wichtig:

- Das Event ist noch nicht sofort oeffentlich sichtbar.
- Nach der Pruefung gibt es eine Rueckmeldung.
- Bei Freigabe wird das Event auf der Website sichtbar.
- Bei Ablehnung wird ein Grund hinterlegt, damit man weiss, was angepasst werden muss.

Der Bot kann Nutzer zusaetzlich per Direktnachricht informieren, wenn sich der Status aendert.

## 14. Bestehendes Event bearbeiten

Nutzer koennen ueber `Bestehendes Event bearbeiten` ihre vorhandenen Event-Eintraege erneut oeffnen.

### 14.1 Auswahl eines vorhandenen Events

Der Bot zeigt eine Auswahlliste mit den eigenen Events. Dort sieht man in der Regel:

- Titel
- Datum
- aktuellen Status

Nach der Auswahl wird das Event wieder im 3-Schritte-System geoeffnet.

### 14.2 Bearbeitungslogik

Der Bearbeitungsablauf ist derselbe wie bei einer Neuerstellung:

- Basisdaten bearbeiten
- Details bearbeiten
- Extras bearbeiten
- erneut zur Pruefung senden

Der grosse Vorteil: Man muss das Event nicht komplett neu anlegen.

## 15. Veroeffentlichtes Event absagen

Wenn ein bereits sichtbares Event nicht stattfinden kann, koennen Nutzer es absagen lassen.

### 15.1 Auswahl eines veroeffentlichten Events

Der Bot zeigt eine Auswahl aller eigenen Events, die bereits freigegeben wurden.

### 15.2 Bestaetigung

Nach der Auswahl fragt der Bot noch einmal nach, ob das Event wirklich als abgesagt markiert werden soll.

Wichtig:

- Das Event wird nicht komplett geloescht.
- Es bleibt sichtbar.
- Es wird stattdessen klar als `abgesagt` markiert.

Das ist wichtig fuer Besucher, damit sie sehen, dass ein geplanter Termin nicht stattfindet.

## 16. Automatische Hilfen des Bots

Der Bot hilft Nutzern an mehreren Stellen:

- validiert Datum und Uhrzeit
- prueft URLs
- erkennt fehlende Pflichtfelder
- zeigt nach jedem Schritt eine Vorschau
- erlaubt spaeteres Weiterbearbeiten
- kann moegliche Duplikate erkennen

Dadurch wird der Nutzerprozess deutlich fehlertoleranter und leichter nachvollziehbar.

## 17. Status eines Events aus Nutzersicht

Aus Sicht eines normalen Nutzers gibt es vor allem diese wichtigen Zustaende:

- `draft`: Event wurde begonnen, aber noch nicht eingereicht
- `pending`: Event wurde zur Pruefung gesendet
- `approved`: Event wurde freigegeben und ist sichtbar
- `cancelled`: Event ist sichtbar, aber als abgesagt markiert
- `rejected`: Event wurde abgelehnt und muss ueberarbeitet werden

Diese Status helfen dabei zu verstehen, wo sich ein Event gerade im Ablauf befindet.

## 18. Wochenfeed

Zusatzlich zum eigentlichen Kalender gibt es einen Wochenfeed.

Er wird fuer die naechsten sieben Tage erstellt und steht in mehreren Formen bereit:

- als Discord-Feed
- als RSS-Feed
- als JSON-Feed

Der Feed zeigt:

- eine kompakte Wochenuebersicht
- danach fuer jedes Event eine eigene Detaildarstellung

Wenn in einem Zeitraum keine Events vorhanden sind, zeigt der Feed eine leere Wochenvorschau.

## 19. Typischer Ablauf fuer Nutzer

Ein normaler Nutzer arbeitet meist in diesem Ablauf:

1. Kalender oeffnen und passende Events ansehen
2. bei Bedarf dem Discord-Server ueber den Button beitreten
3. im Discord den Event-Ablauf starten
4. Basisdaten, Details und Extras ausfuellen
5. Event-Vorschau kontrollieren
6. Event zur Pruefung senden
7. auf Rueckmeldung warten
8. nach Freigabe das Event auf der Website wiederfinden
9. spaeter bei Bedarf bearbeiten oder absagen

## 20. Kurzuebersicht aller Nutzerfunktionen

### Auf der Website

- Monatsansicht
- Tagesnavigation
- Fokusbereich
- Filter nach Zeitfenster, Typ und Venue
- Umschaltung zwischen Events und Venues
- Schnellnavigation
- Event-Karten
- Detailansicht
- Links zu Discord und externen Seiten
- Zusatzdialoge fuer Rechtshinweis, Transparenz und Kategorisierung
- Wochenfeed

### Im Discord-Bot

- neues Event erstellen
- bestehendes Event bearbeiten
- veroeffentlichtes Event absagen
- Event in drei Schritten ausfuellen
- Eingaben pruefen lassen
- Vorschau ansehen
- Event zur Pruefung senden

## 21. Fazit

Der Light Hotspots Kalender ist fuer Nutzer so aufgebaut, dass die Website als saubere Event-Uebersicht dient, waehrend der Discord-Bot den eigentlichen Bearbeitungsprozess uebernimmt. Zusammen ergeben beide Systeme einen klaren Ablauf:

- auf der Website informieren
- ueber Discord einreichen
- nach Freigabe wieder auf der Website sichtbar werden

Damit ist das System fuer normale Nutzer einfach, nachvollziehbar und ohne technische Vorkenntnisse bedienbar.
