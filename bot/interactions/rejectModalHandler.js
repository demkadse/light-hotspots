import { rejectTemplate, getTemplate } from "../services/templateService.js";

export async function handleRejectModal(interaction, client) {
  try {
    const templateId = interaction.customId.split("_").pop();
    const reason = interaction.fields.getTextInputValue("reason");

    const template = await getTemplate(templateId);

    await rejectTemplate(templateId, reason);

    await interaction.reply({
      content: "❌ Event wurde abgelehnt.",
      ephemeral: true
    });

    try {
      const user = await client.users.fetch(template.created_by);

      await user.send(
`❌ **Dein Event wurde abgelehnt**

Leider konnte dein Event in der aktuellen Form nicht freigegeben werden.

**Event:**
📌 ${template.title}

**Grund der Ablehnung:**
${reason}

👉 Bitte erstelle dein Event erneut und korrigiere die oben genannten Punkte.  
Du kannst dein bestehendes Template als Grundlage nutzen.

Wenn du unsicher bist, melde dich gern – wir helfen dir weiter!`
      );

    } catch (err) {
      console.warn("DM fehlgeschlagen:", err.message);
    }

  } catch (err) {
    console.error("Reject Error:", err);
  }
}