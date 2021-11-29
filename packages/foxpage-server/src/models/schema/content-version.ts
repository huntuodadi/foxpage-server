import { ContentVersion } from '@foxpage/foxpage-server-types';
import { model, Schema } from 'mongoose';

const contentVersionSchema = new Schema<ContentVersion>(
  {
    id: { type: String, required: true, length: 20, unique: true },
    contentId: { type: String, required: true, length: 20 },
    version: { type: String, maxLength: 20, default: '' },
    versionNumber: { type: Number, min: 0, default: 0 },
    status: { type: String, maxLength: 20, default: 'base' },
    content: { type: Object, default: {} },
    creator: { type: String, required: true, length: 20 },
    createTime: { type: Date, default: Date.now, required: true },
    updateTime: { type: Date, default: Date.now, required: true },
    deleted: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
  },
);

contentVersionSchema.pre('save', function(next) {
  const currentTime = Date.now();
  this.updateTime = currentTime;
  if (!this.id) {
    this.createTime = currentTime;
  }
  next();
});

contentVersionSchema.index({ id: 1 });
contentVersionSchema.index({ contentId: 1 });
contentVersionSchema.index({ versionNumber: 1 });
contentVersionSchema.index({ creator: 1 });
contentVersionSchema.index({ deleted: 1 });

export default model<ContentVersion>(
  'fp_application_content_version',
  contentVersionSchema,
  'fp_application_content_version',
);
