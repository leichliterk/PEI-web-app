import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

// Customize the Aura theme with your specific color palette
export const CustomAuraTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    },
    colorScheme: {
      light: {
        formField: {
          borderColor: '{surface.700}',
          hoverBorderColor: '{surface.800}',
        }
      },
      dark: {
        formField: {
          borderColor: '{surface.400}',
          hoverBorderColor: '{surface.300}',
        }
      }
    }
  },
  components: {
    toolbar: {
      root: {
        background: '{primary.600}',
        borderColor: '{primary.700}',
        color: '{surface.0}'
      }
    },
    inputtext: {
      root: {
        borderColor: '{surface.700}',
        hoverBorderColor: '{surface.800}',
      }
    },
    select: {
      root: {
        borderColor: '{surface.700}',
        hoverBorderColor: '{surface.800}',
      }
    },
    multiselect: {
      root: {
        borderColor: '{surface.700}',
        hoverBorderColor: '{surface.800}',
      }
    },
    textarea: {
      root: {
        borderColor: '{surface.700}',
        hoverBorderColor: '{surface.800}',
      }
    },
  }
});
