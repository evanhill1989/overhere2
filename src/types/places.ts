export interface Place {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  isVerified?: boolean;
  primaryType?: string; // Optional field for primary type
  // generative_summary?: string;
}
