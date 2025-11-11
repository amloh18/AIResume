import mongoose, { Document, Schema } from 'mongoose';

export interface ICountryMapping extends Document {
  countryCode: string; // ISO country code: "GB", "US", "IN", etc.
  regionId: string; // Reference to PriceRegion.regionId
  createdAt: Date;
  updatedAt: Date;
}

const countryMappingSchema = new Schema<ICountryMapping>(
  {
    countryCode: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      trim: true,
      uppercase: true
      // Note: Unique constraint creates its own index
    },
    regionId: {
      type: String,
      required: [true, 'Region ID is required'],
      trim: true
      // Note: Index only if needed for queries by regionId
    },
  },
  {
    timestamps: true,
  }
);

// Create model
const CountryMapping = mongoose.models.CountryMapping || mongoose.model<ICountryMapping>('CountryMapping', countryMappingSchema);

export default CountryMapping;

