export const initialData = {
    sectionTitles: {
        summary: "Profile",
        experience: "Professional Experience",
        education: "Education",
        skills: "Skills",
        expertise: "Expertise",
        contact: "Contact",
        projects: "Projects",
        certifications: "Certifications",
        awards: "Awards",
        languages: "Languages",
        interests: "Interests",
        publications: "Publications",
        volunteer: "Volunteer Experience",
        references: "References"
    },
    basics: {
        name: "Amarjot Singh Lohia",
        title: "Senior Data Scientist",
        email: "amarjot.singh@example.com",
        phone: "+91 9876543210",
        location: "Ahmedabad, Gujarat",
        website: "cvcircle.com",
        summary: "Results-driven Data Scientist with a Master's degree in Data Science and 5+ years of experience translating complex datasets into significant business impact. Proven expertise in scoping and deploying end-to-end machine learning models, leveraging advanced techniques in Python, R, and SQL to drive multi-million dollar revenue growth and operational efficiency.",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        showAvatar: true
    },
    experience: [
        {
            id: "exp1",
            company: "TechNova Solutions",
            role: "Senior Data Analyst",
            date: "Jan 2021 - Present",
            description: "<ul><li>Architected and implemented a modular and scalable data pipeline using Apache Kafka, enhancing data presentation capabilities by 40%.</li><li>Optimized user interaction workflows for data dashboards by identifying and rectifying performance bottlenecks.</li><li>Spearheaded key predictive modeling initiatives yielding a 25% increase in operational efficiency across 3 global teams.</li></ul>"
        },
        {
            id: "exp2",
            company: "Innovate AI",
            role: "Customer Insights Analyst",
            date: "Mar 2017 - Dec 2020",
            description: "<ul><li>Optimized marketing spend and product strategy through data-driven insights, impacting 20% of the customer base.</li><li>Led the development and execution of comprehensive customer segmentation strategies using PowerBI and Tableau.</li></ul>"
        },
        {
            id: "exp3",
            company: "DataTech Analytics",
            role: "Junior Analyst",
            date: "Jun 2015 - Feb 2017",
            description: "<ul><li>Created automated reporting structures, decreasing manual entry times by 40 hours per month.</li><li>Collaborated with data engineering teams to migrate legacy databases to AWS infrastructure securely.</li></ul>"
        }
    ],
    education: [
        {
            id: "edu1",
            institution: "University of California, Berkeley",
            degree: "M.S. Data Science",
            date: "2013 - 2015",
            description: "Graduated with Honors. Focus on Systems Architecture and Machine Learning Algorithms."
        },
        {
            id: "edu2",
            institution: "Stanford University",
            degree: "B.S. Computer Science",
            date: "2009 - 2013",
            description: "Minor in Statistical Analysis. Dean's List all semesters. Led the University Data Science Club."
        }
    ],
    projects: [
        {
            id: "prj1",
            name: "Sales Forecasting Model",
            role: "Lead Analyst",
            date: "2022 - Present",
            description: "<ul><li>Developed a predictive model using XGBoost to forecast quarterly sales, reducing error margin by 15%.</li><li>Integrated the model into the company's primary CRM dashboard via a secure Python REST API.</li></ul>"
        },
        {
            id: "prj2",
            name: "Customer Churn Analyzer",
            role: "Data Scientist",
            date: "2021",
            description: "<ul><li>Built an end-to-end pipeline analyzing user behavior to predict churn with 89% accuracy.</li></ul>"
        }
    ],
    certifications: [
        { id: "cert1", name: "AWS Certified Data Analytics", issuer: "Amazon Web Services", date: "2023" },
        { id: "cert2", name: "Google Professional Data Engineer", issuer: "Google Cloud", date: "2021" },
        { id: "cert3", name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2020" }
    ],
    awards: [
        { id: "awd1", name: "Excellence in Analytics Award", issuer: "Innovate AI", date: "2019" },
        { id: "awd2", name: "Top Contributor", issuer: "Open Source Data Org", date: "2018" }
    ],
    skills: {
        languages: "Python, R, SQL, JavaScript, HTML/CSS",
        frameworks: "TensorFlow, PyTorch, React, Node.js",
        tools: "Tableau, PowerBI, Docker, Git, AWS, GCP"
    },
    languages: "English (Native), Hindi (Fluent), Punjabi (Fluent), Spanish (Basic)",
    interests: "Open-source contributing, Photography, Chess, Bouldering, Machine Learning Research",
    publications: [
        { id: "pub1", title: "Predictive Analytics in Modern E-commerce", publisher: "Journal of Data Science", date: "Oct 2022", description: "Co-authored a comprehensive paper detailing modern algorithmic approaches to cart abandonment." },
        { id: "pub2", title: "Scaling Node.js Microservices", publisher: "Tech Architecture Weekly", date: "Jan 2020", description: "Published a guide on effectively utilizing Docker and Kubernetes for high-availability systems." }
    ],
    volunteer: [
        { id: "vol1", organization: "Data for Good", role: "Lead Mentor", date: "2019 - Present", description: "<ul><li>Mentoring underprivileged students in fundamental programming and data visualization skills.</li></ul>" },
        { id: "vol2", organization: "Global Tech Rescue", role: "IT Consultant", date: "2017 - 2019", description: "<ul><li>Provided pro-bono database management solutions for international disaster relief NGOs.</li></ul>" }
    ],
    references: [
        { id: "ref1", name: "Dr. Jonathan Crane", role: "CTO at TechNova Solutions", contact: "j.crane@technova.com | +1 555-0192" },
        { id: "ref2", name: "Sarah Jenkins", role: "VP of Engineering at Innovate AI", contact: "s.jenkins@innovateai.io | +1 555-9012" }
    ]
};
