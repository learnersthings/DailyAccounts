import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { PRESET_ICONS } from '../constants/presets';

interface IconPickerModalProps {
  visible: boolean;
  onClose: () => void;
  icon: string;
  onSelect: (icon: string) => void;
}

export default function IconPickerModal({ visible, onClose, icon, onSelect }: IconPickerModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
              <View style={styles.header}>
                <AppText style={[styles.title, { color: colors.text }]}>Choose Icon</AppText>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 400 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.gridContainer}>
                    {PRESET_ICONS.map(i => (
                      <View key={i} style={styles.gridItem}>
                        <TouchableOpacity
                          style={[
                            styles.iconSwatch, 
                            { 
                              backgroundColor: icon === i ? colors.primary : colors.surface 
                            }
                          ]}
                          onPress={() => {
                            onSelect(i);
                            onClose();
                          }}
                        >
                          <Ionicons name={i as any} size={24} color={icon === i ? '#fff' : colors.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  gridItem: {
    width: '16.66%',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

