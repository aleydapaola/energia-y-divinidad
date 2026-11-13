import { defineField, defineType } from "sanity";

import { PrivateProductFileInput } from "../../components/PrivateProductFileInput";

export default defineType({
  name: "privateProductFile", title: "Archivo privado", type: "object",
  components: { input: PrivateProductFileInput },
  fields: [
    defineField({ name: "title", title: "Título del archivo", type: "string" }),
    defineField({ name: "description", title: "Descripción", type: "text", rows: 2 }),
    defineField({ name: "pathname", type: "string", hidden: true, readOnly: true, validation: (Rule) => Rule.required().error("Sube el archivo antes de publicar.") }),
    defineField({ name: "originalFilename", type: "string", hidden: true, readOnly: true }),
    defineField({ name: "contentType", type: "string", hidden: true, readOnly: true }),
    defineField({ name: "size", type: "number", hidden: true, readOnly: true }),
  ],
  preview: { select: { title: "title", filename: "originalFilename" }, prepare: ({ title, filename }) => ({ title: title || filename || "Archivo pendiente de subir", subtitle: filename }) },
});
