# Beskrivelse af koden er følgende:

Koden har til formål at foretage et simpelt login- og registreringssystem, der bruger en SQLite-database til at gemme brugere og deres hashede adgangskoder. 

Samtidig er der inkluderet en smule beskyttelse mod svage adgangskoder ved at sammenligne dem med en liste fra rockyou.txt.

Udover Node.js og SQLite3 anvendes der:
- Bcrypt til at hashe adgangskoder
- readlineSync til at læse input fra terminalen

## Koden har i alt 4 muligheder:

* Hovedmenu / mainMenu()
- Viser valgmuligheder og kalder de andre funktioner.

* Registrering / registerUser()
- Læser bruger-ID og adgangskode
- Checker adgangskoden mod rockyou.txt
- Hasher og gemmer adgangskoden i databasen

* Login / loginUser()
- Henter bruger fra databasen
- Sammenligner adgangskoden med hash
- Logger brugeren ind ved match

* Vis brugere / showAllUsers()
- Henter og viser alle brugere fra databasen

Koden er struktureret omkring mainMenu() til at styre flowet, hvilket er derfor den bliver kaldt hver gang efter registering/vis brugere foretages