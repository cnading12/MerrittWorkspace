export default function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CoworkingSpace",
    "@id": "https://merrittworkspace.net/#organization",
    "name": "Merritt Workspace",
    "alternateName": "Merritt Workspace Coworking",
    "description": "Premium coworking space in Sloan's Lake, Denver offering dedicated desks and private offices—with member access to our adjacent 1905 historic church flex space. 24/7 access, 3 minutes to I-25, 22 free parking spots.",
    "url": "https://merrittworkspace.net",
    "logo": "https://merrittworkspace.net/images/hero/logo.png",
    "image": [
      "https://merrittworkspace.net/images/hero/outside-hero.webp",
      "https://merrittworkspace.net/images/hero/dedicated-desk.webp",
      "https://merrittworkspace.net/images/private-offices/single.webp"
    ],
    "telephone": "+1-720-357-9499",
    "email": "memberservices@merrittworkspace.net",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "2246 Irving Street",
      "addressLocality": "Denver",
      "addressRegion": "CO",
      "postalCode": "80211",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 39.75098609588881,
      "longitude": -105.03225422342487
    },
    "hasMap": "https://www.google.com/maps?cid=10105178442159244045",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "00:00",
        "closes": "23:59",
        "description": "24/7 member access"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "17:00",
        "description": "Office hours for tours and support"
      }
    ],
    "priceRange": "$200 - $1200/month",
    "currenciesAccepted": "USD",
    "paymentAccepted": ["Credit Card", "Debit Card"],
    "areaServed": [
      {
        "@type": "City",
        "name": "Denver",
        "sameAs": "https://en.wikipedia.org/wiki/Denver"
      },
      {
        "@type": "Neighborhood",
        "name": "Sloan's Lake",
        "containedInPlace": {
          "@type": "City",
          "name": "Denver"
        }
      },
      {
        "@type": "Neighborhood",
        "name": "West Denver"
      }
    ],
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "High-Speed WiFi", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "24/7 Access", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Meeting Rooms", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Phone Booths", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Kitchen", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Free Coffee & Tea", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Mail Handling", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Event Space", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Pet-Friendly", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Free Parking", "value": true }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Coworking Memberships",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Dedicated Desk",
            "description": "Your own permanent desk in our collaborative coworking space in Sloan's Lake, Denver. Includes 24/7 access, high-speed WiFi, 2 hours meeting room credits, and all-you-can-drink coffee and tea."
          },
          "price": "200",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "200",
            "priceCurrency": "USD",
            "unitText": "month"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Single Private Office",
            "description": "Private lockable office for 1 person in Denver's Sloan's Lake neighborhood. Includes professional business address, 4 hours meeting room credits, and 24/7 building access."
          },
          "price": "500",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "500",
            "priceCurrency": "USD",
            "unitText": "month"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "2-Desk Private Office",
            "description": "Private lockable office for 2 people near I-25 in Denver. Includes professional business address, 6 hours meeting room credits, and 24/7 access."
          },
          "price": "700",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "700",
            "priceCurrency": "USD",
            "unitText": "month"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Large Team Office (4-8 Desks)",
            "description": "Spacious private office for teams of 4-8 in West Denver. Includes unlimited meeting room access, professional business address, and priority event space booking."
          },
          "price": "1200",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "1200",
            "priceCurrency": "USD",
            "unitText": "month"
          }
        }
      ]
    },
    "sameAs": [
      "https://www.merrittwellness.net"
    ],
    "foundingDate": "2023",
    "knowsAbout": [
      "Coworking",
      "Office Space Rental",
      "Remote Work",
      "Business Services",
      "Meeting Room Rental"
    ],
    "slogan": "Where Work Meets Community",
    "isAccessibleForFree": false,
    "publicAccess": false
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
