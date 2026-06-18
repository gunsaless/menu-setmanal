# Menú setmanal · Adrià & Helena

Generador de menús setmanals segons la temporada de l'any, adaptat a dues persones,
amb llista de la compra i exportació per WhatsApp.

## Engegar

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # tests de la lògica
npm run build    # build estàtic a /dist (desplegable a qualsevol host)
```

## Com funciona

1. **Dates** — tries inici + nombre de dies. La temporada es calcula automàticament.
2. **Qui menja a casa** — per cada dia i àpat (dinar/sopar), marca 🏠 (casa) o 🚶 (fora) per a cadascú.
3. **Generar** — omple dinar i sopar des de la base de dades de la temporada, evitant repeticions i variant proteïnes.
4. **Llista de la compra** — agrega i escala els ingredients pels comensals.
5. **Exportar** — text pla per enganxar a WhatsApp.

Esmorzar, mig matí i berenar es deixen com a rutines fixes (no es generen).

## La base de dades (el que editaràs tu)

Tot el contingut viu en fitxers JSON, separat del codi:

- `src/data/dishes.json` — els plats: nom, temporades, àpats, racions base, etiquetes i ingredients.
- `src/data/seasons.json` — rangs de dates → temporada.

Per afegir un plat, copia un bloc existent a `dishes.json` i edita'l. Els camps:

| camp | què és |
|------|--------|
| `seasons` | `estiu`, `final-estiu`, `tardor`, `hivern` |
| `slots` | `dinar`, `sopar` |
| `course` | `primer` (entrant) i/o `segon` (plat principal). Cada àpat es genera amb un primer + un segon |
| `servingsBase` | per quantes racions són les quantitats d'ingredients |
| `tags` | per variar (`peix`, `carn`, `llegum`, `crema`, `amanida`...) |
| `ingredients[].scalable` | `false` = no es multiplica pels comensals (sal, oli) |

## Arquitectura

```
src/data/      → base de dades editable (JSON)
src/core/      → lògica pura en TypeScript (sense React): season, generate, grocery, export
src/components → UI React
src/store.ts   → estat (Zustand)
```

La lògica de `core/` no depèn de React: és testejable i es podria moure a un backend o app mòbil.

## Desplegar

L'app és estàtica (`npm run build` → `dist/`), així que es pot penjar a qualsevol host.

**Netlify** (més fàcil): arrossega la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop),
o connecta el repo i farà servir `netlify.toml` automàticament.

**GitHub Pages**: puja el repo a GitHub, ves a *Settings → Pages → Source: GitHub Actions*.
El workflow `.github/workflows/deploy.yml` construeix i publica a cada `push` a `main`.

## Pendents / idees

- Completar la base de dades amb la resta de receptes (els `.docx` originals tenen fotos, no text).
- Mode "llista" alternatiu i impressió.
- Guardar menús generats / historial.
