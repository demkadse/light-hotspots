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

  if (event.image && !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(event.image)) {
    errors.push("Bild-URL muss mit http(s) beginnen und auf .jpg, .jpeg, .png oder .gif enden.");
  }

  return errors;
}
