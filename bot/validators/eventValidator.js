function isValidDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return false;

  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);

  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)
  );
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEventInput(event) {
  const errors = [];
  const validateCoreFields = "title" in event || "venue" in event || "date" in event || "time" in event || "description" in event;

  if (validateCoreFields) {
    if (!event.title?.trim()) errors.push("Titel fehlt.");
    if (!event.venue?.trim()) errors.push("Location fehlt.");
    if (!event.description?.trim()) errors.push("Beschreibung fehlt.");
    if (!event.date?.trim()) {
      errors.push("Datum fehlt.");
    } else if (!isValidDate(event.date.trim())) {
      errors.push("Datum muss im Format TT.MM.JJJJ sein.");
    }

    if (!event.time?.trim()) {
      errors.push("Uhrzeit fehlt.");
    } else if (!isValidTime(event.time.trim())) {
      errors.push("Uhrzeit muss im Format HH:MM sein.");
    }
  }

  if (event.end_time?.trim() && !isValidTime(event.end_time.trim())) {
    errors.push("Endzeit muss im Format HH:MM sein.");
  }

  if ("server" in event) {
    if (!event.server?.trim()) {
      errors.push("Server fehlt.");
    } else if (event.server.trim().length > 60) {
      errors.push("Server darf maximal 60 Zeichen lang sein.");
    }
  }

  if ("recurrence_rule" in event && event.recurrence_rule) {
    const recurrenceRule = event.recurrence_rule.trim().toLowerCase();
    if (!["weekly", "wöchentlich", "woechentlich"].includes(recurrenceRule)) {
      errors.push("Wiederholung muss leer bleiben oder `weekly` sein.");
    }
  }

  if (event.image) {
    const image = event.image.trim();
    const imagePath = (() => {
      try {
        return new URL(image).pathname;
      } catch {
        return "";
      }
    })();

    if (!isValidHttpUrl(image) || !/\.(jpg|jpeg|png|gif|webp)$/i.test(imagePath)) {
      errors.push("Bild-URL muss mit http(s) beginnen und auf eine Bilddatei zeigen.");
    }
  }

  if (event.link?.trim() && !isValidHttpUrl(event.link.trim())) {
    errors.push("Link muss mit http:// oder https:// beginnen.");
  }

  if (event.discord_link?.trim()) {
    const discordLink = event.discord_link.trim();

    if (!isValidHttpUrl(discordLink)) {
      errors.push("Discord-Link muss mit http:// oder https:// beginnen.");
    } else if (!/discord\.(gg|com)$/i.test(new URL(discordLink).hostname)) {
      errors.push("Discord-Link muss auf discord.gg oder discord.com zeigen.");
    }
  }

  return errors;
}
