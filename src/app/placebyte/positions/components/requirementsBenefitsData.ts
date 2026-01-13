// Market-specific requirements and benefits for position creation

export const REQUIREMENTS_OPTIONS = {
  USA: [
    // Education
    "Bachelor's Degree",
    "Master's Degree",
    "PhD",
    "Associate's Degree",
    "High School Diploma/GED",
    "Professional Certification",
    
    // Experience
    "0-2 years experience",
    "3-5 years experience",
    "5-7 years experience",
    "7-10 years experience",
    "10+ years experience",
    "Entry Level",
    "Mid-Level",
    "Senior Level",
    "Executive Level",
    
    // Technical Skills
    "Proficiency in Microsoft Office",
    "Data Analysis Skills",
    "Project Management Experience",
    "CRM Software Experience (Salesforce, HubSpot)",
    "Programming Skills (Python, Java, JavaScript)",
    "Database Management (SQL, MongoDB)",
    "Cloud Platform Experience (AWS, Azure, GCP)",
    "Agile/Scrum Methodology",
    
    // Soft Skills
    "Excellent Communication Skills",
    "Leadership Experience",
    "Team Management",
    "Problem-Solving Skills",
    "Time Management",
    "Adaptability",
    "Critical Thinking",
    
    // Legal/Compliance
    "US Work Authorization",
    "Security Clearance",
    "Valid Driver's License",
    "Background Check",
    "Drug Screening",
    
    // Industry-Specific
    "Healthcare: Active RN/LPN License",
    "Finance: Series 7 License",
    "Finance: CPA Certification",
    "IT: CompTIA A+ Certification",
    "IT: CISSP Certification",
    "Marketing: Google Analytics Certification",
    "HR: SHRM-CP/SCP Certification",
  ],
  
  PHILIPPINES: [
    // Education
    "Bachelor's Degree",
    "Master's Degree",
    "Vocational/Technical Diploma",
    "Senior High School Graduate",
    "College Undergraduate",
    "Professional License (PRC)",
    
    // Experience
    "Fresh Graduate/Trainee",
    "1-2 years experience",
    "3-5 years experience",
    "5+ years experience",
    "BPO Experience",
    "Call Center Experience",
    "Offshore Experience",
    
    // Language Skills
    "Fluent in English (Written & Spoken)",
    "Neutral/American Accent",
    "Excellent English Comprehension",
    "Multilingual Skills",
    
    // Technical Skills
    "Computer Literacy",
    "MS Office Proficiency",
    "Fast Typing Speed (40+ WPM)",
    "CRM Software Knowledge",
    "Basic IT Troubleshooting",
    "Social Media Management",
    "Data Entry Skills",
    "Chat Support Experience",
    
    // BPO/Customer Service
    "Customer Service Experience",
    "Technical Support Background",
    "Sales Experience",
    "Email/Chat Support",
    "Phone Support Experience",
    "Escalation Handling",
    "Quality Assurance Knowledge",
    
    // Soft Skills
    "Strong Communication Skills",
    "Team Player",
    "Attention to Detail",
    "Multi-tasking Ability",
    "Can Work Under Pressure",
    "Flexible Schedule",
    "Can Work Night Shift",
    
    // Legal/Work Setup
    "Willing to Work On-site",
    "Willing to Work From Home",
    "Willing to Work Shifting Schedule",
    "NBI Clearance",
    "Valid Government ID",
    "Internet Connection (for WFH)",
    "Own Laptop/PC (for WFH)",
    
    // Industry-Specific
    "BPO: HIPAA Compliance Knowledge",
    "Healthcare: Medical Terminology Knowledge",
    "Finance: Banking Experience",
    "Real Estate: MLS Knowledge",
    "E-commerce: Order Processing Experience",
  ]
};

export const BENEFITS_OPTIONS = {
  USA: [
    // Health & Wellness
    "Health Insurance (Medical, Dental, Vision)",
    "Life Insurance",
    "Disability Insurance (Short & Long-term)",
    "Mental Health Support/EAP",
    "Wellness Programs",
    "Gym Membership/Fitness Reimbursement",
    "Health Savings Account (HSA)",
    "Flexible Spending Account (FSA)",
    
    // Financial
    "401(k) Retirement Plan",
    "401(k) Company Match",
    "Stock Options/RSUs",
    "Performance Bonuses",
    "Profit Sharing",
    "Commuter Benefits",
    "Tuition Reimbursement",
    "Student Loan Assistance",
    "Financial Planning Services",
    
    // Time Off
    "Paid Time Off (PTO)",
    "Unlimited PTO",
    "Sick Leave",
    "Parental Leave (Maternity/Paternity)",
    "Paid Holidays",
    "Bereavement Leave",
    "Sabbatical Leave",
    "Volunteer Time Off",
    
    // Work Flexibility
    "Remote Work Options",
    "Hybrid Work Model",
    "Flexible Hours",
    "4-Day Work Week",
    "Compressed Work Schedule",
    
    // Professional Development
    "Professional Development Budget",
    "Conference Attendance",
    "Certification Reimbursement",
    "Continuing Education",
    "Mentorship Programs",
    "Career Advancement Opportunities",
    
    // Perks & Benefits
    "Company Car/Car Allowance",
    "Phone/Internet Reimbursement",
    "Home Office Stipend",
    "Relocation Assistance",
    "Employee Discounts",
    "Free Snacks/Meals",
    "Company Events",
    "Pet-Friendly Office",
    "Childcare Assistance",
    
    // Legal/Compliance
    "Workers' Compensation",
    "Unemployment Insurance",
    "COBRA Coverage",
  ],
  
  PHILIPPINES: [
    // Mandated Benefits
    "SSS (Social Security System)",
    "PhilHealth",
    "Pag-IBIG Fund",
    "13th Month Pay",
    "Service Incentive Leave (5 days)",
    
    // Health & Wellness
    "HMO Coverage",
    "HMO Dependent Coverage",
    "Life Insurance",
    "Accident Insurance",
    "Medical/Dental Reimbursement",
    "Free Annual Physical Exam",
    "Mental Health Support",
    "Telemedicine Services",
    
    // Financial
    "Performance Bonus",
    "Quarterly Incentives",
    "Attendance Bonus",
    "Referral Bonus",
    "Loyalty Bonus",
    "Rice Subsidy/Allowance",
    "Clothing Allowance",
    "Communication Allowance",
    "Transportation Allowance",
    "Meal Allowance",
    
    // Time Off
    "Vacation Leave (15-20 days)",
    "Sick Leave (15 days)",
    "Birthday Leave",
    "Maternity Leave (105-120 days)",
    "Paternity Leave (7 days)",
    "Solo Parent Leave (7 days)",
    "Bereavement Leave",
    "Emergency Leave",
    
    // Work Flexibility
    "Work From Home Setup",
    "Hybrid Work Arrangement",
    "Flexible Time",
    "No Undertime Policy",
    "Compressed Work Week",
    
    // Professional Development
    "Training & Development Programs",
    "Skills Enhancement Workshops",
    "Career Path Progression",
    "Upskilling Opportunities",
    "Certification Support",
    "Language Training",
    
    // BPO-Specific Benefits
    "Night Shift Differential (10-30%)",
    "Hazard Pay",
    "Attendance Incentives",
    "Queue Busters/Breakers",
    "Free Coffee/Snacks",
    "Nap Rooms",
    "Gaming/Recreation Areas",
    "Transportation Service",
    "Sleeping Quarters (for graveyard shift)",
    
    // Perks & Benefits
    "Company Events & Outings",
    "Team Building Activities",
    "Holiday Gifts/Bonuses",
    "Employee Recognition Programs",
    "Anniversary Gifts",
    "Employee Assistance Program",
    "Discounts & Perks (Merchants)",
    "Loan Assistance",
    "Housing Assistance",
    
    // Equipment & Tools
    "Company Laptop Provided",
    "Work From Home Equipment",
    "Internet Subsidy",
    "Headset & Peripherals",
    "Ergonomic Chair",
    
    // Legal
    "Mandatory Benefits Compliance",
    "Regular Employment Status",
    "COE Upon Request",
    "Tax Support/BIR Forms",
  ]
};

// Helper function to get all requirements
export const getAllRequirements = () => {
  return [...new Set([...REQUIREMENTS_OPTIONS.USA, ...REQUIREMENTS_OPTIONS.PHILIPPINES])].sort();
};

// Helper function to get all benefits
export const getAllBenefits = () => {
  return [...new Set([...BENEFITS_OPTIONS.USA, ...BENEFITS_OPTIONS.PHILIPPINES])].sort();
};

// Helper function to get requirements by market
export const getRequirementsByMarket = (market: 'USA' | 'PHILIPPINES' | 'BOTH') => {
  if (market === 'USA') return REQUIREMENTS_OPTIONS.USA;
  if (market === 'PHILIPPINES') return REQUIREMENTS_OPTIONS.PHILIPPINES;
  return getAllRequirements();
};

// Helper function to get benefits by market
export const getBenefitsByMarket = (market: 'USA' | 'PHILIPPINES' | 'BOTH') => {
  if (market === 'USA') return BENEFITS_OPTIONS.USA;
  if (market === 'PHILIPPINES') return BENEFITS_OPTIONS.PHILIPPINES;
  return getAllBenefits();
};