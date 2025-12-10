import { Header } from "@/components/kuamini/header"
import { Footer } from "@/components/kuamini/footer"

export const metadata = {
  title: "Kuamini Systems - Business Solutions | Kuamini Systems",
  description:
    "Discover Kuamini Systems Private Limited, your partner in innovative business solutions. We specialize in enhancing your online presence and driving growth through tailored services.",
}

export default function ServicesPage() {
  const services = [
    {
      title: "Cloud Solutions",
      description: "Reliable cloud services to improve accessibility and security for your data.",
    },
    {
      title: "IT Consultancy",
      description: "Expert advice and strategies to optimize your IT infrastructure.",
    },
    {
      title: "Software Development",
      description: "Custom software solutions designed to enhance your business operations.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl font-semibold text-gray-800 mb-4">Our Services</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            At Kuamini Systems, we provide tailored IT solutions for your business needs.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image */}
            <div>
              <img src="/laptop-with-code-programming-dark-background.jpg" alt="Services" className="w-full rounded-lg shadow-lg" />
            </div>

            {/* Services List */}
            <div className="space-y-8">
              {services.map((service, index) => (
                <div key={index}>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
