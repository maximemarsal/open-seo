"use client";

import React from "react";
import { motion } from "framer-motion";
import { CTA } from "../types/blog";
import { ArrowRight, ExternalLink } from "lucide-react";

interface CTAPreviewProps {
  cta: CTA;
}

export default function CTAPreview({ cta }: CTAPreviewProps) {
  const title = cta.generatedText?.title || cta.title || "Ready to Transform Your Business?";
  const description = cta.generatedText?.description || cta.description || "Join thousands of companies already benefiting from our solution. Start your free trial today and see results in minutes.";
  const buttonText = cta.generatedText?.buttonText || cta.buttonText || "Get Started Free";

  const getStyleClasses = () => {
    if (cta.style === "custom" && cta.customColors) {
      return {
        container: "",
        title: "",
        description: "",
        button: "",
        customStyle: {
          container: {
            backgroundColor: cta.customColors.background || "#f0f0f0",
          },
          title: {
            color: cta.customColors.titleColor || "#111",
          },
          description: {
            color: cta.customColors.descriptionColor || "#555",
          },
          button: {
            backgroundColor: cta.customColors.buttonBackground || "#111",
            color: cta.customColors.buttonTextColor || "#fff",
          },
        },
      };
    }

    switch (cta.style) {
      case "bordered":
        return {
          container: "border-2 border-gray-900 bg-white",
          title: "text-gray-900",
          description: "text-gray-600",
          button: "bg-gray-900 text-white hover:bg-gray-800",
        };
      case "gradient":
        return {
          container: "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700",
          title: "text-white",
          description: "text-gray-200",
          button: "bg-white text-gray-900 hover:bg-gray-100",
        };
      case "minimal":
        return {
          container: "bg-gray-50",
          title: "text-gray-900",
          description: "text-gray-600",
          button: "text-gray-900 hover:text-gray-700 underline",
        };
      default:
        return {
          container: "bg-gray-100 border border-gray-200",
          title: "text-gray-900",
          description: "text-gray-600",
          button: "bg-gray-900 text-white hover:bg-gray-800",
        };
    }
  };

  const styles = getStyleClasses();
  const isCustom = cta.style === "custom" && styles.customStyle;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl p-8 ${!isCustom ? styles.container : ""} ${cta.imageUrl ? "flex gap-6 items-center" : ""}`}
      style={isCustom ? styles.customStyle?.container : undefined}
    >
      {cta.imageUrl && (
        <div className="flex-shrink-0">
          <img
            src={cta.imageUrl}
            alt={title}
            className="w-32 h-32 object-cover rounded-xl"
          />
        </div>
      )}
      
      <div className="flex-1">
        <h3 
          className={`text-2xl font-bold mb-3 ${!isCustom ? styles.title : ""}`}
          style={isCustom ? styles.customStyle?.title : undefined}
        >
          {title}
        </h3>
        <p 
          className={`mb-6 ${!isCustom ? styles.description : ""}`}
          style={isCustom ? styles.customStyle?.description : undefined}
        >
          {description}
        </p>
        
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${!isCustom ? styles.button : ""}`}
          style={isCustom ? styles.customStyle?.button : undefined}
        >
          {buttonText}
          {cta.style === "minimal" ? (
            <ArrowRight className="w-4 h-4" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

