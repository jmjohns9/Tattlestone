# Open and free alternatives to ICON TrueFix

Researched 2026-10-10. GitHub stats were read from the GitHub API on that date.

## 1. What TrueFix is

- **Who sells it:** Harbor Freight sells it as repair-information software for its ICON T10 and T8 scanners. The T10 includes one year free; the T8 needs a paid subscription; the T7 isn't supported. It runs in a web browser on up to five devices.
- **What it includes:**
  - Wiring diagrams.
  - Vehicle lookup by VIN, YMME or ACES.
  - OEM repair and maintenance procedures.
  - TSBs and OEM position statements.
  - ADAS repair details.
  - "Near-time" OEM revision updates.
  - The T10 bundles a separate product, Identifix Code-Assist, for crowdsourced confirmed fixes.
- **Coverage:** US light-duty vehicles, mostly 1985 to present. Tesla, Rivian, Lucid and Fisker aren't covered.
- **Where the data comes from:** Harbor Freight says the content comes "directly from the OEMs", which means licensed OEM service information. It doesn't name the aggregator. Crowdsourced fixes come only from the bundled Identifix product (owned by Solera). Sources: [harborfreight.com/truefix](https://www.harborfreight.com/truefix), [Harbor Freight press release](https://newsroom.harborfreight.com/product/automotive/2024/09/harbor-freight-tools-adds-professional-t10-wireless-diagnostic-scanner-with-truefix-to-its-icon-lineup/).

**Bottom line:** almost all of TrueFix's value is licensed OEM content. Open projects can match identification, generic codes, recalls and TSB summaries. They can't legally match wiring, flow charts, torque, component locations or procedures.

---

## 2. Sources by area

**Legend:** ✅ usable and clean · ⚠️ usable with caveats · ❌ legal or quality risk

### 1. Diagnostic flow charts
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| None open | — | — | — | — | — | Flow charts are OEM-authored and copyrighted. Patents (e.g. US7373226) describe trees but provide no data. |
| [charm.li](https://charm.li) (Operation CHARM) | None stated | HTML; 700 GB torrent | Active | Widely used by DIYers | ~40 makes, 1982–2013 (claims of newer years conflict) | ❌ Factory-style manual content of unclear provenance. Fine to view; don't ingest. |
| [Gonzih/mcp-charm](https://github.com/Gonzih/mcp-charm) | No license | JS MCP server | 2026-05 | 0★ | Same as charm.li | Wraps charm.li for LLM lookup. Has the same legal problem. |

### 2. Wiring diagrams
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| None open | — | — | — | — | — | No open wiring-diagram dataset exists. |
| [wireviz/WireViz](https://github.com/wireviz/WireViz) | GPL-3.0 | Python, YAML → SVG | 2026-06 | 5.3k★ | Tool only | ✅ A renderer for diagrams you author yourself, e.g. GMT800 draw circuits. |
| [commaai/opendbc](https://github.com/commaai/opendbc) | MIT | DBC files, Python | 2026-10 | 3.5k★ | Many CAN cars, ~2016+ | ✅ CAN signal definitions, not wiring. Useful to make the EcuBus screen real. |
| charm.li | — | HTML | — | — | 1982–2013 | ❌ Contains wiring diagrams; view only. |

### 3. OEM maintenance schedules
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| OEM owner portals ([Ford](https://www.ford.com/support/how-tos/search/maintenance-schedules/), owners.toyota.com, GM owner manuals) | Free to view; terms forbid scraping | PDF, HTML | Current | — | Brand only | ⚠️ Authoritative, but there's no API, so entering data by hand is the legal path. |
| [hargata/lubelog](https://github.com/hargata/lubelog) (LubeLogger) | MIT (personal use; commercial use needs a subscription) | C#, web | 2026-09 | 2.9k★ | Records only | ⚠️ A maintenance-record tracker; has no schedule data. |
| [CarMD API](https://dev-website.carmd.com/?p=3692) | Commercial, freemium (tiers unverified) | REST, JSON | Active | — | US 1996+ | ⚠️ Schedule by mileage. Low-cost option. |

### 4. Fluid specifications
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| Owner's manual, "Capacities and Specifications" section | Free to view | PDF | — | — | Per vehicle | ⚠️ The only free authoritative source. Enter by hand. |
| [OpenSpec (Visor)](https://openspec.visor.vin/about) | Described as "free to build on" (license not verified) | One structured file per YMM | Pre-1.0 | New | Narrow, US only | ⚠️ No fluid fields found. Watch for future releases. |
| [MOTOR Fluids](https://www.motor.com/products/fluids) | Commercial | API, bulk | Current | Industry standard | US 1985+ | Paid. Includes drain-plug and lug-nut torque. |

### 5. Torque specifications
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| None open | — | — | — | — | — | No open fastener-torque dataset exists. |
| [KAPSARC US Vehicle Spec Data 2015](https://opennetzero.org/king-abdullah-petroleum-studies-and-research-center-kapsarc/vehicle-spec-data) | Cites Edmunds terms | CSV | 2015 | — | US, 2015 | ❌ Engine output torque only, not fastener torque. Derived from Edmunds. |
| charm.li | — | HTML | — | — | 1982–2013 | ❌ View only. |

### 6. DTC information
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| [foerbsnavi/OBDex](https://github.com/foerbsnavi/OBDex) | **Data CC0, code MIT** | YAML source; JSON on GitHub Pages; JSON Schema | 2026-10 (active) | 5★ | 9,533 generic codes (P0/P2/P3/B0/C0/U0/U3); EN/DE | ✅ **Best pick.** Includes causes with likelihood, symptoms, repair difficulty, cost and hours, and a MIL flag. Descriptions are original text with a source URL per code. Excludes manufacturer-specific codes. |
| [tekseport/obd2-codes](https://github.com/tekseport/obd2-codes) | Reuse with attribution (no SPDX) | CSV, JSON | 2026-10 | 0★ | 9,414 generic codes | ⚠️ Taken from obdcodeslist.com. Descriptions only. |
| [mytrile/obd-trouble-codes](https://github.com/mytrile/obd-trouble-codes) | MIT | JSON, CSV, SQLite | 2014 | 60★ | Generic | ⚠️ Stale. Descriptions only. |
| [todrobbins/dtcdb](https://github.com/todrobbins/dtcdb) | MIT | CSV | 2013 | 34★ | Generic | ⚠️ Stale. |
| [fabiovila/OBDIICodes](https://github.com/fabiovila/OBDIICodes) | MIT | JSON, C header | 2023 | 22★ | Generic | ⚠️ |
| [xinings/DTC-Database](https://github.com/xinings/DTC-Database) | No license | XML, JSON, Python | 2019 | 1★ | 6,665 codes | ❌ No license, so it can't be reused. |
| [Automotive-9/dtc-codes](https://github.com/Automotive-9/dtc-codes) | No license | Python | 2025-12 | 1★ | Manufacturer-specific, by make | ❌ No license and unknown provenance; probably scraped. |
| [OBDb](https://github.com/OBDb) | **CC-BY-SA-4.0** | JSON signal sets, one repo per model | 2026-10 (daily) | 753 repos; used by the `elm327_obdii` Python library | 160+ models, including Silverado 1500/2500/3500 | ✅ Manufacturer-specific PIDs and some DTCs. Share-alike applies to the data. |
| [NHTSA complaints API](https://catalog.data.gov/dataset/nhtsas-office-of-defects-investigation-odi-complaints-nhtsa-api) | Public domain | REST, JSON | Live | — | US, all makes | ✅ Real-world failure narratives by component. A rough stand-in for "verified fixes". |
| [CarMD API](https://www.apitracker.io/a/carmd) | Commercial | REST | Active | — | US 1996+ | ⚠️ Gives the most likely fix for a DTC plus cost. Paid. |

### 7. Component location
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| None open | — | — | — | — | — | No open dataset exists. Only OEM service information and charm.li (❌) have it. |
| Tattlestone's own `PlatformProfile` | Yours | TypeScript | — | — | gmt800 | ✅ The fuse panel maps already work this way, so the pattern can be extended to component locations. |

### 8. Special service tools
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| OEM tool program catalogs (GM Kent-Moore "J-" numbers, Ford Rotunda, Stellantis Miller, Toyota SST via TIS) | Free to browse (except Toyota TIS, which is paid) | Web catalogs | Current | — | Brand only | ⚠️ Tool numbers exist there, but there's no data mapping a tool to a repair procedure. That mapping lives in OEM service information. |

### 9. Vehicle lookup (VIN, YMME, ACES)
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/) | Public domain; rate-limited | REST, JSON | Live | Industry standard | US-market vehicles, 1981+ | ✅ **Already used** in `main.ts` (`obd:decode-vin`). |
| [vPIC standalone database](https://vpic.nhtsa.dot.gov/downloads) | Public domain | MS SQL `.bak` (174 MB) and PostgreSQL 17 dump; monthly | 2026-03 | — | Same as the API | ✅ Offline VIN decoding with no rate limits. |
| [cardog-ai/corgi](https://github.com/cardog-ai/corgi) | ISC | TypeScript, built on vPIC | 2026-04 | 332★ | Same as vPIC | ✅ **Fits Tattlestone's stack**: offline VIN decoding in Node. |
| [davidpeckham/vpic-api](https://github.com/davidpeckham/vpic-api) | MIT | Python client | 2024-01 | 10★ | Same as vPIC | ✅ Python option. |
| [EPA fueleconomy.gov](https://fueleconomy.gov/feg/ws) | Public (US government) | CSV, XML, REST | Yearly | Widely used | 1984+ | ✅ Engine size, cylinder count, transmission and drive type, to fill in engine data vPIC lacks. |
| [abhionlyone/us-car-models-data](https://github.com/abhionlyone/us-car-models-data) | No SPDX license | CSV | 2025-11 | 530★ | US YMM | ⚠️ Check the license before shipping it. |
| ACES and VCdb ([Auto Care Association](https://autocare.org/about-us/frequently-asked-questions/details/what-is-aces-and-pies-data)) | Paid license or membership | XML, Access, ASCII | Monthly | Industry standard | North America | ❌ No free copy exists. Only needed if you join parts fitment data. |

### 10. Procedures, TSBs and recalls
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| NHTSA recalls API (`api.nhtsa.gov/recalls/recallsByVehicle`) | Public domain | REST, JSON | Live | — | US, all makes | ✅ Lookup by make, model and year, or by campaign number. |
| [NHTSA manufacturer communications / TSBs](https://catalog.data.gov/dataset/nhtsas-office-of-defects-investigation-odi-technical-service-bulletins-system-tsbs-downloa) | Public domain | Flat files (TSV/CSV in 5-year zips; `MfrComms.txt` schema) plus per-bulletin PDFs on `static.nhtsa.gov/odi/tsbs/` | 2024 schema; ongoing | — | US, 1995+ | ✅ **The biggest free win.** Since October 2012 (MAP-21), the full bulletin PDFs are public, not just summaries. Not every TSB is included. |
| NHTSA complaints API | Public domain | REST, JSON | Live | — | US | ✅ |
| OEM service sites ([NASTF directory](https://www.aftermarketnews.com/?p=29600)) | Paid short-term access | Web | Current | — | Brand only | ⚠️ The legal way to get full procedures. Toyota TIS is roughly $25–30 for 2 days or $95–105 a month. Older listings show Ford around $22 for 72 hours and GM around $20 for 72 hours (prices unverified). |
| charm.li | — | HTML | — | — | 1982–2013 | ❌ Has procedures; view only. |

### 11. Parts diagrams
| Source | License / terms | Format | Updated | Adoption | Coverage | Notes |
|---|---|---|---|---|---|---|
| [OldBoyCoder/openPER](https://github.com/OldBoyCoder/openPER) | MIT for code; the data is Fiat's | SCSS, web | 2025-03 | 5★ | Fiat group (ePer release 84) | ❌ Uses original Fiat data. Single brand. |
| [thmahe/PR-830](https://github.com/thmahe/PR-830) | No license | HTML, OCR | 2023 | 0★ | Renault | ❌ Abandoned; OCR of OEM documents. |
| Dealer parts sites (e.g. gmpartsdirect) and [7zap](https://7zap.com/en/catalog/cars/) | Free to view | Web | Current | — | 70 brands | ⚠️ View or link only; there's no dataset. |

---

## 3. Coverage matrix

| # | Area | Best open or free source | Quality |
|---|---|---|---|
| 1 | Flow charts | None | 🔴 |
| 2 | Wiring diagrams | None (WireViz to author your own) | 🔴 |
| 3 | Maintenance schedules | Owner's manuals, entered by hand | 🟠 |
| 4 | Fluid specs | Owner's manuals, entered by hand | 🟠 |
| 5 | Torque specs | None | 🔴 |
| 6 | DTC information | OBDex (generic, CC0) + OBDb (manufacturer PIDs) + NHTSA complaints | 🟢 generic / 🟠 manufacturer-specific / 🔴 verified fixes |
| 7 | Component location | None | 🔴 |
| 8 | Special service tools | OEM tool catalogs (lookup only) | 🔴 |
| 9 | VIN / YMME | vPIC (API and offline) + corgi + EPA | 🟢 (ACES 🔴) |
| 10 | TSBs and recalls | NHTSA recalls, complaints and TSB PDFs | 🟢 (procedures 🔴) |
| 11 | Parts diagrams | None that are clean | 🔴 |

## 4. Gap analysis

- **No legal open equivalent:** flow charts, wiring diagrams, torque specs, component locations, procedures, parts diagrams and service-tool mappings. All of these are OEM-copyrighted content, and that content is what TrueFix is actually selling.
- **Partial coverage:**
  - Manufacturer-specific DTCs (OBDb is growing but sparse).
  - "Verified fixes": no open equivalent of Identifix's 3 million confirmed fixes exists.
  - Maintenance schedules and fluids (facts are free to read, but not machine-readable).
- **Solved:** VIN and YMME decoding, recalls, TSBs and complaints, and generic DTC definitions.

## 5. Options for filling the gaps

1. **Hand-enter data for vehicles you own.** Extend `PlatformProfile` with `maintenance`, `fluids`, `torque` and `componentLocations` fields, populated from the owner's manual and a factory service manual you own. Facts such as "5.3 L oil capacity is 6 qt" aren't copyrightable, but OEM wording and illustrations are. This is how the fuse map already works.
2. **Buy short-term OEM access.** 72-hour or 2-day passes cost about $20–30 per job (see the NASTF directory). It's the legal way to get flow charts, wiring and procedures, but it's for viewing only, not ingesting.
3. **Low-cost APIs:**
   - CarMD: DTC fixes, maintenance and repair cost; freemium.
   - VinAudit: specs; 100 free queries, then $100 a month plus $0.10 per query.
   - Smartcar: live diagnostics on connected cars.
4. **Commercial data licenses:** MOTOR (DTCs with flow charts, fluids, torque, maintenance, part illustrations; XML/JSON API) or Identifix Direct-Hit. These are the only routes to TrueFix-level parity, and they cost thousands of dollars a year or more.
5. **Build a "verified fixes" layer yourself:** each saved session already records the code, freeze frame and live data. Add a "what fixed it" field to session records, and over time it becomes your own Identifix for the vehicles you work on.
6. **Wait for regulation:** the Massachusetts Data Access Law was still before the First Circuit as of August 2026, and the federal REPAIR Act (H.R. 1566) hasn't passed. Neither currently provides open service information.

---

## 6. Feature candidates for Tattlestone

Ranked by value against effort. All of them keep the app read-only (see `readOnly.test.ts`).

| # | Feature | Source | Effort | Notes |
|---|---|---|---|---|
| A | **Recalls / TSBs / complaints panel**, keyed on the decoded VIN | NHTSA recalls and complaints APIs; TSB flat file plus PDF links | S–M | Fetch in the main process alongside `obd:decode-vin`. The renderer CSP (`connect-src 'self'`) stays unchanged. Cross-reference active DTCs against the TSB and complaint component text. |
| B | **Replace or extend the DTC catalog with OBDex** | OBDex `all.json` (CC0) | S | Add a JSON input path to `scripts/gen-dtc-catalog.ts`. Grows the catalog from 371 to 9,533 codes with causes, symptoms and difficulty. Keep the curated GMT800 entries as overrides. |
| C | **Offline VIN decoding** | corgi (ISC) or the vPIC standalone database | S | Removes the network dependency and the rate limit. |
| D | **Engine and transmission enrichment** | EPA fueleconomy CSV | S | Fills in engine fields that vPIC leaves blank. |
| E | **Manufacturer-specific PIDs** | OBDb signal sets (CC-BY-SA) | M | Needs Mode 22 (ReadDataByIdentifier, a read-only service). That means adding `22` to `ALLOWED` in `readOnly.test.ts` and to the commander allowlist, which deliberately touches the safety boundary. CAN vehicles only, so the GMT800 J1850 truck is mostly out. Ship the data with attribution and under its share-alike terms. |
| F | **Maintenance, fluids and torque in `PlatformProfile`** | Entered by hand from the owner's manual and service manual | M | Start with gmt800. Add a Maintenance screen with mileage-based due items computed from the odometer (PID 0xA6, or entered by the user). |
| G | **"What fixed it" field on saved sessions**, plus Claude using it as context | Your own data | S | Builds the verified-fixes layer. Feed recall, TSB and fix history into the assistant snapshot, fenced against prompt injection (an open security finding). |
| H | **Real passive CAN monitor on the EcuBus screen** | opendbc (MIT) + ELM327 `ATMA` | L | Listen-only, so it's still read-only. Replaces the demo data. Note that `ATMA` isn't in the AT/ST pass-through; review it. |
| I | **External reference links** | charm.li deep link by year, make and model; OEM owner portal | XS | Link out only. Don't ingest or redistribute the content. |

Python projects ([python-OBD](https://github.com/brendan-w/python-OBD), GPL-2.0, 1.3k★; `elm327_obdii`; `vpic-api`) are useful for prototyping, but Tattlestone is TypeScript and Electron. Prefer the data files (JSON, CSV or SQL), and use corgi for VIN decoding.
