import { Button } from '@/components/ui/button';
import { useStepState } from '@/store/registration-form';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Drawer, DrawerTrigger } from '../ui/drawer';
import { Confirmation } from './confirmation';

type NavigationProps = {
  totalSteps: number;
};

export const Navigation = ({ totalSteps }: NavigationProps) => {
  const {
    currentStep,
    handlePreviousStep,
    handleNextStep,
    formSchemas: { firstSchema, secondSchema, thirdSchema, fourthSchema },
  } = useStepState();
  const { getValues, setError, clearErrors } = useFormContext();

  // Validate the current form data against the zod schema and set the errors
  const validateSchema = (schema: z.Schema) => {
    // Reseting the errors
    clearErrors();

    // Validating the data
    const validationResult = schema.safeParse(getValues());
    if (!validationResult.success) {
      console.log('Navigation errors ::: ', validationResult.error.issues);
      validationResult.error.issues.forEach((issue) => {
        // Setting the error for the field that failed validation
        setError(issue.path[0].toString(), {
          type: 'manual',
          message: issue.message,
        });
      });
    } else {
      handleNextStep();
    }
  };

  const handleNextOnClick = () => {
    switch (currentStep) {
      case 0:
        if (firstSchema) validateSchema(firstSchema);
        break;
      case 1:
        if (secondSchema) validateSchema(secondSchema);
        break;
      case 2:
        if (thirdSchema) validateSchema(thirdSchema);
        break;
      case 3:
        if (fourthSchema) validateSchema(fourthSchema);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex justify-end gap-4">
      <Button
        variant="ghost"
        className='text-secondary-foreground'
        onClick={handlePreviousStep}
        disabled={currentStep === 0}
      >
        Atrás
      </Button>

      {currentStep !== totalSteps - 1 ? (
        <Button
          className="bg-primary"
          type="button"
          onClick={handleNextOnClick}
        >
          Siguiente
        </Button>
      ) : (
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              className="border-primary text-primary"
              type="button"
            >
              Registrar
            </Button>
          </DrawerTrigger>
          <Confirmation data={getValues()} />
        </Drawer>
      )}
    </div>
  );
};
