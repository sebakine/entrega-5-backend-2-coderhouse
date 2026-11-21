import mongoose from 'mongoose';

export const EVENT_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
});

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    startsAt: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: Object.values(EVENT_STATUS),
      default: EVENT_STATUS.PUBLISHED,
    },
    // Dueño del recurso: base de la validación de propiedad. Inmutable una vez creado.
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

eventSchema.index({ status: 1, startsAt: 1 });

export const EventModel = mongoose.model('Event', eventSchema);
