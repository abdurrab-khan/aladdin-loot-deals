import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Linking,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import Input from "./Input";
import Affiliates from "./Affiliates";
import ModalContainer from "@/components/dialog/ModalContainer";
import { IconSymbol } from "@/components/ui/IconSymbol";

import toast from "@/utils";

import useAppSession from "@/context/AppContext";

import queryClient from "@/api/clients/queryClient";
import type { Affiliate, Product } from "@/types";
import { addAffiliateLink } from "@/api/services/affiliate";

import { Colors } from "@/constants/Colors";
import { affiliateProvider } from "@/constants/const";

interface AddAffiliateProps {
  visible: boolean;
  product: Product;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function AddAffiliate({
  visible,
  product,
  setVisible,
}: AddAffiliateProps) {
  const { user } = useAppSession();

  const [groupedAffiliateUrls, setGroupedAffiliateUrls] = useState<Affiliate[]>(
    [],
  );
  const [affiliateUrl, setAffiliateUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { is_grouped, product_id, url, website } = product;

  const affiliateInputRef = React.useRef<TextInput>(null);

  // Function to handle affiliate link submission
  const handleAffiliateLinkSubmit = async () => {
    if (!affiliateUrl.trim()) {
      toast("Please enter a valid affiliate link.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (is_grouped) {
        const updatedAffiliateUrls = [
          ...groupedAffiliateUrls,
          {
            productId: product_id,
            id: `grouped_${Date.now()}`,
            url: affiliateUrl,
            isDefault: groupedAffiliateUrls.length === 0,
            createdAt: new Date().toISOString(),
          },
        ];
        setGroupedAffiliateUrls(updatedAffiliateUrls);

        const existingGroupedAffiliateUrls = JSON.parse(
          (await AsyncStorage.getItem("grouped_affiliate_urls")) ?? "{}",
        );

        await AsyncStorage.setItem(
          "grouped_affiliate_urls",
          JSON.stringify({
            ...existingGroupedAffiliateUrls,
            [product_id]: updatedAffiliateUrls,
          }),
        );
      } else {
        await addAffiliateLink(user?.id!, product_id, website.id, affiliateUrl); // Add affiliate link
        // Invalidate the query to trigger a refetch of the affiliate links
        queryClient.invalidateQueries({
          queryKey: ["affiliateUrls", product_id],
        });
      }
    } catch (e) {
      toast((e as Error).message, ToastAndroid.LONG);
    } finally {
      setAffiliateUrl("");
      setIsSubmitting(false);
    }
  };

  const getAffiliateLink = async () => {
    let affiliateUrl: string = "";
    if (website.name === "Amazon") {
      affiliateUrl = product.url;
    } else {
      affiliateUrl = affiliateProvider[website.name.toLowerCase()];
    }

    if (!affiliateUrl) {
      toast(`No affiliate provider configured for ${website.name}`);
      return;
    }

    const canOpen = await Linking.canOpenURL(affiliateUrl);
    if (canOpen) {
      Linking.openURL(affiliateUrl).catch(() => toast(`Failed to open link.`));
    } else {
      toast(`Invalid link.`);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(product.url);
      toast("Product URL copied!");
    } catch {
      toast("Failed to copy");
    }
  };

  useEffect(() => {
    const loadAffiliateUrls = async () => {
      const rawGroupedAffiliates = await AsyncStorage.getItem(
        "grouped_affiliate_urls",
      );

      const affiliateUrls = rawGroupedAffiliates
        ? JSON.parse(rawGroupedAffiliates)
        : {};

      if (affiliateUrls[product_id]) {
        setGroupedAffiliateUrls(affiliateUrls[product_id]);
      }
    };
    loadAffiliateUrls();
  }, [product_id, is_grouped, setGroupedAffiliateUrls]);

  useEffect(() => {
    if (!visible) return;
    if (affiliateInputRef.current) {
      affiliateInputRef.current.focus();
    }
  }, [visible]);

  return (
    <ModalContainer
      visible={visible}
      animationType="slide"
      setVisible={setVisible}
      isLoading={isSubmitting}
      modelStyle={[styles.modalSize, { height: "auto", maxHeight: "98%" }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ width: "100%" }}
      >
        <View>
          <Text style={styles.titleText}>Manage Affiliate Links</Text>
          <View style={styles.contentContainer}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product URL</Text>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Input value={url} readOnly />
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCopyUrl}
                  style={styles.rowActionButton}
                >
                  <IconSymbol
                    name="copy-outline"
                    size={18}
                    color={Colors.dark.header}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <Affiliates
              productId={product_id}
              isGrouped={is_grouped}
              groupedAffiliateUrls={groupedAffiliateUrls}
              setGroupedAffiliateUrls={setGroupedAffiliateUrls}
            />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add New Link</Text>
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    value={affiliateUrl}
                    ref={affiliateInputRef}
                    onChangeText={setAffiliateUrl}
                    placeholder="Enter affiliate link..."
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={getAffiliateLink}
                  style={styles.rowActionButton}
                >
                  <IconSymbol
                    name="link-outline"
                    size={18}
                    color={Colors.dark.header}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                disabled={isSubmitting}
                activeOpacity={0.7}
                style={styles.submitButton}
                onPress={handleAffiliateLinkSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={Colors.dark.header} />
                ) : (
                  <Text style={styles.btnText}>Add Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ModalContainer>
  );
}

const styles = StyleSheet.create({
  modalSize: {
    maxHeight: "85%",
    width: "90%",
    padding: 20,
  },
  titleText: {
    fontSize: 20,
    color: Colors.dark.titleText,
    fontWeight: "700",
    marginBottom: 20,
  },
  contentContainer: {
    gap: 20,
  },
  section: {
    gap: 8,
  },
  linksSection: {
    gap: 8,
    maxHeight: 180,
  },
  linkList: {
    flexGrow: 0,
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.dark.titleText,
    fontWeight: "600",
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  rowActionButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.text,
  },
  linkItem: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "space-between",
  },
  linkUrl: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: "500",
  },
  linkDate: {
    color: Colors.dark.text,
    fontSize: 11,
    opacity: 0.5,
    marginTop: 4,
  },
  linkActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionIconButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  emptyText: {
    color: Colors.dark.text,
    opacity: 0.4,
    fontSize: 14,
    fontStyle: "italic",
  },
  submitButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.text,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark.header,
  },
});
