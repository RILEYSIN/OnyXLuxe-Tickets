window.EVENTS = [
  {
    id: "concert-night-live",
    title: "Concert Night Live",
    description:
      "Join us for an unforgettable night of music and entertainment. Featuring top artists and a vibrant atmosphere.",
    date: "August 10, 2025",
    time: "7:00 PM WAT",
    location: "Grand Arena, Lagos",
    host: "OnyXLuxe Concerts",
    price: 5000,
    image:
      "https://placehold.co/900x600/007bff/ffffff?text=Concert+Night",
    imageAlt: "Concert Night Live",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "grand-soccer-final",
    title: "Grand Soccer Final",
    description:
      "Experience the thrill of the grand final! Witness history in the making with your favorite teams.",
    date: "September 5, 2025",
    time: "4:00 PM WAT",
    location: "National Stadium, Abuja",
    host: "Premier Sports League",
    price: 5000,
    image:
      "https://placehold.co/900x600/28a745/ffffff?text=Sports+Event",
    imageAlt: "Grand Soccer Final",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "innovate-tech-summit",
    title: "Innovate Tech Summit 2025",
    description:
      "A premier gathering for tech enthusiasts and professionals. Explore the latest trends and network.",
    date: "October 1, 2025",
    time: "9:00 AM WAT",
    location: "Eko Convention Centre, Lagos",
    host: "Tech Innovators Hub",
    price: 5000,
    image:
      "https://placehold.co/900x600/ffc107/333333?text=Tech+Summit",
    imageAlt: "Innovate Tech Summit",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "laugh-out-loud-comedy",
    title: "Laugh Out Loud Comedy",
    description:
      "An evening of stand-up comedy featuring nationally recognized comedians. Get ready to laugh!",
    date: "August 20, 2025",
    time: "8:00 PM WAT",
    location: "Terra Kulture, Lagos",
    host: "Comedy Central Africa",
    price: 5000,
    image:
      "https://placehold.co/900x600/6f42c1/ffffff?text=Comedy+Show",
    imageAlt: "Laugh Out Loud Comedy",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "modern-art-expo",
    title: "Modern Art Expo",
    description:
      "Discover captivating artworks from contemporary artists around the globe. A visual feast for art lovers.",
    date: "November 12, 2025",
    time: "10:00 AM - 6:00 PM WAT",
    location: "Nike Art Gallery, Lagos",
    host: "Art Collective Nigeria",
    price: 5000,
    image:
      "https://placehold.co/900x600/dc3545/ffffff?text=Art+Exhibition",
    imageAlt: "Modern Art Expo",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "gourmet-food-festival",
    title: "Gourmet Food Festival",
    description:
      "Taste delectable dishes from renowned chefs and local eateries. A culinary journey awaits!",
    date: "September 28, 2025",
    time: "11:00 AM - 9:00 PM WAT",
    location: "Muri Okunola Park, Lagos",
    host: "Culinary Guild of Nigeria",
    price: 5000,
    image:
      "https://placehold.co/900x600/17a2b8/ffffff?text=Food+Festival",
    imageAlt: "Gourmet Food Festival",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "grand-play-premiere",
    title: "The Grand Play: Premiere",
    description:
      "A timeless classic brought to life on stage. An emotional and captivating theatrical experience.",
    date: "December 1, 2025",
    time: "6:30 PM WAT",
    location: "Muson Centre, Lagos",
    host: "National Theatre Troupe",
    price: 5000,
    image:
      "https://placehold.co/900x600/fd7e14/ffffff?text=Theater+Play",
    imageAlt: "The Grand Play",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "esports-gaming-summit",
    title: "E-Sports Gaming Summit",
    description:
      "Join the biggest names in gaming for an epic competition. Live tournaments and exclusive game reveals!",
    date: "November 20, 2025",
    time: "10:00 AM - 8:00 PM WAT",
    location: "Landmark Event Centre, Lagos",
    host: "African Gaming Federation",
    price: 5000,
    image:
      "https://placehold.co/900x600/20c997/ffffff?text=Gaming+Expo",
    imageAlt: "E-Sports Gaming Summit",
    paymentLinksByQuantity: {
      1: "",
    },
  },
  {
    id: "spring-fashion-gala",
    title: "Spring Fashion Gala",
    description:
      "Witness the latest trends and collections from leading designers. A night of style and elegance.",
    date: "October 15, 2025",
    time: "7:00 PM WAT",
    location: "Civic Centre, Lagos",
    host: "Lagos Fashion Council",
    price: 5000,
    image:
      "https://placehold.co/900x600/6610f2/ffffff?text=Fashion+Show",
    imageAlt: "Spring Fashion Gala",
    paymentLinksByQuantity: {
      1: "",
    },
  },
];

window.formatNaira = function (amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
};
