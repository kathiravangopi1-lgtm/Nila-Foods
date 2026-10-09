const mongoose = require('mongoose');

const razorpayWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, trim: true },
  eventType: { type: String, required: true, trim: true },
  status: { type: String, enum: ['processing', 'processed'], default: 'processing' },
}, { timestamps: true });

razorpayWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.models.RazorpayWebhookEvent
  || mongoose.model('RazorpayWebhookEvent', razorpayWebhookEventSchema);
