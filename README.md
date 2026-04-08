# harlamov_nizamov_makeev_coolify
# Inventuurisüsteem

Inventuurisüsteem on veebirakendus väikekontorile seadmete haldamiseks ja arvestuseks.  
Süsteem võimaldab hallata kontoris kasutatavaid seadmeid, kasutajaid ning märkmeid seadmete kohta.

Projekt kasutab järgmisi tehnoloogiaid:
- **React + Vite + Tailwind CSS** kasutajaliidese jaoks
- **PocketBase** autentimise ja andmebaasi jaoks
- **Stripe** tellimuse ja makselahenduse jaoks
- **Coolify** juurutamiseks

## Projekti eesmärk

Rakenduse eesmärk on anda ettevõttele lihtne võimalus:
- hallata seadmete nimekirja
- hallata kasutajate rolle
- siduda kasutajad tööruumiga
- lisada seadmete kohta märkmeid
- piirata tasuta paketi seadmete arvu
- kasutada tasulist paketti piirangute eemaldamiseks

## Rollid

Süsteemis on kaks peamist rolli:

### Admin
Admin saab:
- vaadata juhtpaneeli
- vaadata kõiki seadmeid
- lisada uusi seadmeid
- muuta olemasolevaid seadmeid
- kustutada seadmeid
- vaadata kõiki kasutajaid
- hallata tellimuse infot ja arveldust

### Worker
Worker saab:
- vaadata juhtpaneeli
- vaadata seadmete nimekirja
- avada seadme detailvaate
- lisada seadme kohta märkmeid

Worker ei saa:
- hallata kasutajaid
- avada Billing lehte
- kustutada või täielikult hallata seadmeid nagu admin

## Põhifunktsioonid

- registreerimine ja sisselogimine
- rollipõhine ligipääs
- tööruumiga seotud kasutajad
- seadmete nimekiri
- seadme detailvaade
- märkmete lisamine seadmetele
- kasutajate haldamine admini jaoks
- tasuta paketi limiit: kuni 10 seadet
- tasuline pakett: piiramatu arv seadmeid
- Stripe makselink tellimuse aktiveerimiseks

## Andmemudel

Rakenduses kasutatakse järgmisi PocketBase kollektsioone:

### `users`
Autentimiskollektsioon kasutajate jaoks.

Väljad:
- `name`
- `role`
- `workspace`

### `devices`
Seadmete andmed.

Väljad:
- `name`
- `type`
- `inventory_number`
- `serial_number`
- `status`
- `assigned_to`
- `description`
- `workspace`

### `device_notes`
Seadmete märkmete hoidmiseks.

Väljad:
- `device`
- `author`
- `text`

### `workspaces`
Tööruumide ja tellimuse info hoidmiseks.

Väljad:
- `name`
- `owner`
- `subscription_status`
- `device_limit`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`

## Tellimuse loogika

Rakenduses kasutatakse tööruumi põhist tellimuse süsteemi.

### Tasuta pakett
- kuni **10 seadet**

### Tasuline pakett
- **piiramatu arv seadmeid**

Kui tellimus on aktiivne, siis tööruumi `subscription_status` väärtus on `active`.

## Stripe

Stripe’i kasutatakse tellimuse aktiveerimiseks.  
Makse tehakse läbi Stripe makselingi.

Pärast edukat makset peab süsteem:
- uuendama tööruumi staatuse väärtusele `active`
- lubama lisada piiramatult seadmeid

## Paigaldamine ja käivitamine

### 1. Projekti kloonimine
```bash
git clone <repo-link>
cd <project-folder>
