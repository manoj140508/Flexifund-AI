export interface StateOption {
  code: string;
  name: string;
  type: 'STATE' | 'UT';
}

export const INDIAN_STATES_AND_UTS: StateOption[] = [
  // 28 States
  { code: 'AP', name: 'Andhra Pradesh', type: 'STATE' },
  { code: 'AR', name: 'Arunachal Pradesh', type: 'STATE' },
  { code: 'AS', name: 'Assam', type: 'STATE' },
  { code: 'BR', name: 'Bihar', type: 'STATE' },
  { code: 'CG', name: 'Chhattisgarh', type: 'STATE' },
  { code: 'GA', name: 'Goa', type: 'STATE' },
  { code: 'GJ', name: 'Gujarat', type: 'STATE' },
  { code: 'HR', name: 'Haryana', type: 'STATE' },
  { code: 'HP', name: 'Himachal Pradesh', type: 'STATE' },
  { code: 'JH', name: 'Jharkhand', type: 'STATE' },
  { code: 'KA', name: 'Karnataka', type: 'STATE' },
  { code: 'KL', name: 'Kerala', type: 'STATE' },
  { code: 'MP', name: 'Madhya Pradesh', type: 'STATE' },
  { code: 'MH', name: 'Maharashtra', type: 'STATE' },
  { code: 'MN', name: 'Manipur', type: 'STATE' },
  { code: 'ML', name: 'Meghalaya', type: 'STATE' },
  { code: 'MZ', name: 'Mizoram', type: 'STATE' },
  { code: 'NL', name: 'Nagaland', type: 'STATE' },
  { code: 'OD', name: 'Odisha', type: 'STATE' },
  { code: 'PB', name: 'Punjab', type: 'STATE' },
  { code: 'RJ', name: 'Rajasthan', type: 'STATE' },
  { code: 'SK', name: 'Sikkim', type: 'STATE' },
  { code: 'TN', name: 'Tamil Nadu', type: 'STATE' },
  { code: 'TS', name: 'Telangana', type: 'STATE' },
  { code: 'TR', name: 'Tripura', type: 'STATE' },
  { code: 'UP', name: 'Uttar Pradesh', type: 'STATE' },
  { code: 'UK', name: 'Uttarakhand', type: 'STATE' },
  { code: 'WB', name: 'West Bengal', type: 'STATE' },

  // 8 Union Territories
  { code: 'AN', name: 'Andaman and Nicobar Islands', type: 'UT' },
  { code: 'CH', name: 'Chandigarh', type: 'UT' },
  { code: 'DH', name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'UT' },
  { code: 'DL', name: 'Delhi', type: 'UT' },
  { code: 'JK', name: 'Jammu and Kashmir', type: 'UT' },
  { code: 'LA', name: 'Ladakh', type: 'UT' },
  { code: 'LD', name: 'Lakshadweep', type: 'UT' },
  { code: 'PY', name: 'Puducherry', type: 'UT' },
];
