/** Site-wide contact and business info for booking sidebar, footer, etc. */
export const SITE_CONFIG = {
  name: "V2studio",
  address: "Krížna 36, Bratislava 811 07",
  addressSubtitle: "Natali Volik (Depilatorium)",
  phone: "+421 95 213 32 58",
  email: "V2studiosk@gmail.com",
  instagram: "https://www.instagram.com/epilroom_bratislava?igsh=eG1va29nbmZtem80",
  facebook: "https://www.facebook.com/people/Epilroom-Bratislava/61567948520222/",
  whatsapp: "https://wa.me/421952133258",
  googleMaps: "https://maps.app.goo.gl/4uaHzXpmc6QCWfH79",
  googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d665.4226260292365!2d17.124094299999996!3d48.15477169999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476c894bc4e9a969%3A0x3c4a062c5737319e!2sKr%C3%AD%C5%BEna%204092%2F36%2C%20811%2007%20Bratislava%2C%20Slovakia!5e0!3m2!1sen!2snl!4v1781891674339!5m2!1sen!2snl",
} as const;

/**
 * Per-place contact details.
 *
 * The studio runs two locations with separate phone numbers and map pins, so a
 * single site-wide block is not enough. `SITE_CONFIG` above stays the
 * site-wide default (depilation / Krížna 36) and is what SEO, JSON-LD, the
 * booking flow and the legal pages read; a landing page that belongs to one
 * place reads its own entry here instead.
 *
 * `instagram` / `facebook` are null while a place has no account yet — the
 * page hides the icons rather than linking to the other place's profile.
 */
export const PLACE_CONTACTS = {
  massage: {
    address: "Jakubovo námestie 13, 811 09 Bratislava",
    /** Broken out for schema.org PostalAddress. */
    postal: {
      streetAddress: "Jakubovo námestie 13",
      addressLocality: "Bratislava",
      postalCode: "811 09",
      addressCountry: "SK",
    },
    geo: { latitude: 48.143171, longitude: 17.1200146 },
    addressSubtitle: "Volik Serhiy",
    phone: "+421 95 213 32 57",
    email: "V2studiosk@gmail.com",
    whatsapp: "https://wa.me/421952133257",
    googleMaps: "https://maps.app.goo.gl/bHmXwHHaSc3vzSiSA",
    /** Keyless embed form — the `pb=` variant is tied to one generated pin. */
    googleMapsEmbed:
      "https://maps.google.com/maps?q=48.143171,17.1200146&z=17&output=embed",
    instagram: null,
    facebook: null,
  },
  depilation: {
    address: SITE_CONFIG.address,
    postal: {
      streetAddress: "Krížna 36",
      addressLocality: "Bratislava",
      postalCode: "811 07",
      addressCountry: "SK",
    },
    geo: { latitude: 48.1548, longitude: 17.1241 },
    addressSubtitle: SITE_CONFIG.addressSubtitle,
    phone: SITE_CONFIG.phone,
    email: SITE_CONFIG.email,
    whatsapp: SITE_CONFIG.whatsapp,
    googleMaps: SITE_CONFIG.googleMaps,
    googleMapsEmbed: SITE_CONFIG.googleMapsEmbed,
    instagram: SITE_CONFIG.instagram,
    facebook: SITE_CONFIG.facebook,
  },
} as const satisfies Record<
  string,
  {
    address: string;
    postal: {
      streetAddress: string;
      addressLocality: string;
      postalCode: string;
      addressCountry: string;
    };
    geo: { latitude: number; longitude: number };
    addressSubtitle: string;
    phone: string;
    email: string;
    whatsapp: string;
    googleMaps: string;
    googleMapsEmbed: string;
    instagram: string | null;
    facebook: string | null;
  }
>;
