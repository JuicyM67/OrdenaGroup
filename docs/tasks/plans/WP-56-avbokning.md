# WP-56 · Avbokning med godkännande + SMS till företaget (ägaren 2026-10-01)

- Inställning `businesses.cancel_approval text not null default 'none'` ∈ none | late | all. `late` = avbokning senare än `cancel_window_hours` före start kräver godkännande.
- Kundens avbokning (r/[token]) som kräver godkännande → ny status `cancel_requested` (blockerar tiden, ingår i no_overlap och BLOCKING_STATUSES), kundsidan visar "väntar på svar". Ägaren godkänner → `cancelled` (+ befintligt reservaCancelada till kund); nekar → tillbaka till föregående status (`confirmed`) + besked till kund ("din avbokning godkändes inte, kontakta oss").
- Företaget får SMS (SE, ClickSend, till `businesses.phone`) med länk `/app/solicitudes/[id]` vid ny bokningsförfrågan (`requested`) och ny avbokningsförfrågan. CL: e-post tills WhatsApp finns. Mejl som idag i båda.
- `/app/solicitudes/[id]`: inloggad (medlem med behörighet för bokningen) ser förfrågan och kan godkänna/neka med ett tryck; annars login → tillbaka hit (cookie-mönstret från WP-46/36).
- Notisklockan och "Att bekräfta" visar även avbokningsförfrågningar.
- Inga nya tester utöver pgTAP för ny status i no_overlap. CI en gång.
