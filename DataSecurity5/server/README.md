# Beskrivelse af koden er følgende:

Koden har samme formål som ExcerciseD40. Dog anvender den ikke Bcrypt til hashing, men SHA256 istedet.

Der er stadig inkluderet en smule beskyttelse mod svage adgangskoder ved at sammenligne dem med en liste fra rockyou.txt.

## Koden har, ligesom D40, i alt 4 muligheder:

* Hovedmenu / mainMenu()
- Viser valgmuligheder og kalder de andre funktioner.

* Registrering / registerUser()
- Læser bruger-ID og adgangskode
- Checker adgangskoden mod rockyou.txt
- Hasher og gemmer adgangskoden i databasen

Kigger man på forskellen mellem Bcrypt fra D40 og SHA256 fra denne opgave, kan man blandt andet konstatere at SHA256 er en hashfunktion hvor den samme input altid giver samme output. Bcrypt er på den anden side langsommere, men mere sikker, da den inkluderer en automatisk saltning og en kostfaktor.

SHA256 funktionen får angivet const mitSalt = 'mitHemmeligeSalt'; som salt, hvilket er angivet inden programmet kører.

* Login / loginUser()
- Henter bruger fra databasen
- Sammenligner adgangskoden med hash
- Logger brugeren ind ved match

* Vis brugere / showAllUsers()
- Henter og viser alle brugere fra databasen

Koden er struktureret omkring mainMenu() til at styre flowet, hvilket er derfor den bliver kaldt hver gang efter registering/vis brugere foretages