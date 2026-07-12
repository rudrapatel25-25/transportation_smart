// Initial Mock Data for TransitOps Smart Transport Operations Platform
// This contains default records to demonstrate workflows, business rules, and analytical graphs.

const INITIAL_VEHICLES = [
  {
    registrationNumber: "MH-12-PQ-1234",
    name: "Tata Ace Gold",
    type: "Mini Truck",
    maxCapacity: 800,
    odometer: 24500,
    acquisitionCost: 550000,
    status: "Available",
    region: "West"
  },
  {
    registrationNumber: "KA-03-TR-5678",
    name: "Mahindra Bolero Pik-Up",
    type: "Pickup",
    maxCapacity: 1300,
    odometer: 48900,
    acquisitionCost: 880000,
    status: "Available",
    region: "South"
  },
  {
    registrationNumber: "DL-01-XY-9999",
    name: "Eicher Pro 2049",
    type: "Light Truck",
    maxCapacity: 3500,
    odometer: 82100,
    acquisitionCost: 1450000,
    status: "In Shop", // Starts in maintenance to show initial In Shop state
    region: "North"
  },
  {
    registrationNumber: "GJ-01-AB-1122",
    name: "Tata Ultra T.7",
    type: "Heavy Truck",
    maxCapacity: 4900,
    odometer: 112000,
    acquisitionCost: 1750000,
    status: "Retired",
    region: "West"
  },
  {
    registrationNumber: "Van-05",
    name: "Maruti Suzuki Super Carry",
    type: "Van",
    maxCapacity: 500,
    odometer: 12500,
    acquisitionCost: 400000,
    status: "Available",
    region: "West"
  }
];

const INITIAL_DRIVERS = [
  {
    name: "Alex",
    licenseNumber: "DL-2023089456",
    licenseCategory: "LMV",
    licenseExpiryDate: "2028-09-15", // Valid
    contactNumber: "+91 98765 43210",
    safetyScore: 94,
    status: "Available"
  },
  {
    name: "Rahul Sharma",
    licenseNumber: "DL-2021102948",
    licenseCategory: "HMV",
    licenseExpiryDate: "2027-04-30", // Valid
    contactNumber: "+91 87654 32109",
    safetyScore: 88,
    status: "On Trip" // Starts on trip
  },
  {
    name: "Karthik Gowda",
    licenseNumber: "DL-2019992384",
    licenseCategory: "Trans",
    licenseExpiryDate: "2029-12-05", // Valid
    contactNumber: "+91 76543 21098",
    safetyScore: 96,
    status: "Available"
  },
  {
    name: "Suresh Kumar",
    licenseNumber: "DL-2015003928",
    licenseCategory: "HMV",
    licenseExpiryDate: "2025-02-14", // EXPIRED (since current date is July 2026)
    contactNumber: "+91 91122 33445",
    safetyScore: 82,
    status: "Off Duty"
  },
  {
    name: "Vikram Singh",
    licenseNumber: "DL-2022091283",
    licenseCategory: "LMV",
    licenseExpiryDate: "2028-11-20", // Valid
    contactNumber: "+91 99887 76655",
    safetyScore: 65,
    status: "Suspended" // Suspended
  }
];

const INITIAL_TRIPS = [
  {
    id: "TRIP-1001",
    source: "Mumbai Warehouse",
    destination: "Pune Distribution Center",
    vehicleRegNumber: "KA-03-TR-5678",
    driverName: "Rahul Sharma",
    cargoWeight: 1100,
    plannedDistance: 150,
    status: "Dispatched",
    createdAt: "2026-07-11T10:00:00Z",
    completedAt: null,
    revenue: 18000,
    fuelConsumed: null,
    finalOdometer: null
  },
  {
    id: "TRIP-1002",
    source: "Delhi Hub",
    destination: "Gurugram Retail Store",
    vehicleRegNumber: "MH-12-PQ-1234",
    driverName: "Alex",
    cargoWeight: 600,
    plannedDistance: 45,
    status: "Completed",
    createdAt: "2026-07-10T08:30:00Z",
    completedAt: "2026-07-10T10:15:00Z",
    revenue: 6500,
    fuelConsumed: 6, // liters
    finalOdometer: 24500
  },
  {
    id: "TRIP-1003",
    source: "Bengaluru Depot",
    destination: "Mysuru Warehouse",
    vehicleRegNumber: "KA-03-TR-5678",
    driverName: "Karthik Gowda",
    cargoWeight: 950,
    plannedDistance: 145,
    status: "Completed",
    createdAt: "2026-07-09T07:00:00Z",
    completedAt: "2026-07-09T10:30:00Z",
    revenue: 15000,
    fuelConsumed: 18, // liters
    finalOdometer: 48750
  }
];

const INITIAL_MAINTENANCE_LOGS = [
  {
    id: "MNT-2001",
    vehicleRegNumber: "DL-01-XY-9999",
    description: "Scheduled Engine Oil & Filter Service",
    scheduledDate: "2026-07-10",
    cost: 4500,
    status: "Active",
    createdAt: "2026-07-10T09:00:00Z",
    completedAt: null
  },
  {
    id: "MNT-2002",
    vehicleRegNumber: "MH-12-PQ-1234",
    description: "Brake Pad Replacement & Caliper Cleaning",
    scheduledDate: "2026-07-05",
    cost: 3200,
    status: "Completed",
    createdAt: "2026-07-05T08:00:00Z",
    completedAt: "2026-07-05T14:00:00Z"
  }
];

const INITIAL_EXPENSES = [
  {
    id: "EXP-3001",
    vehicleRegNumber: "MH-12-PQ-1234",
    type: "Fuel",
    amount: 600, // Liters * cost per liter
    liters: 6,
    date: "2026-07-10",
    description: "Fuel refill for Trip TRIP-1002"
  },
  {
    id: "EXP-3002",
    vehicleRegNumber: "KA-03-TR-5678",
    type: "Fuel",
    amount: 1800,
    liters: 18,
    date: "2026-07-09",
    description: "Fuel refill for Trip TRIP-1003"
  },
  {
    id: "EXP-3003",
    vehicleRegNumber: "MH-12-PQ-1234",
    type: "Maintenance",
    amount: 3200,
    liters: null,
    date: "2026-07-05",
    description: "Maintenance service MNT-2002"
  },
  {
    id: "EXP-3004",
    vehicleRegNumber: "KA-03-TR-5678",
    type: "Toll",
    amount: 350,
    liters: null,
    date: "2026-07-11",
    description: "Highway toll charges"
  }
];

// Helper to copy/get data from localStorage or fallback to defaults
function getStoredData(key, defaultData) {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error parsing localStorage key "${key}":`, e);
    }
  }
  localStorage.setItem(key, JSON.stringify(defaultData));
  return JSON.parse(JSON.stringify(defaultData)); // Deep copy
}

function saveStoredData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
