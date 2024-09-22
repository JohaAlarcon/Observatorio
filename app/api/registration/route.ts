import { NextResponse } from 'next/server';
import { conn, queries } from '@/lib/mysql';
import { getFormData } from '@/actions/_form';
import { z } from 'zod';
import { FIRST_TABLE, getSchema, SECOND_TABLE } from '@/lib/form';
import { env } from '@/config/env';
import { OkPacket } from '@/lib/definitions';

export async function POST(request: Request) {
  const data = await request.json();

  // Getting the form schema
  const formData = await getFormData();
  const formSchema: z.Schema = getSchema(formData);

  // Validating the data against the zod schema
  const validationResult = formSchema.safeParse(data);

  // Validating wether the data has the correct values
  if (validationResult.success) {
    // Separating the data as required
    const { violencia_asociada, ...registerData } = data;
    const associatedViolences: Array<Option> = violencia_asociada;
    console.log('POST registerData ::: ', registerData);
    console.log('POST associatedViolences ::: ', associatedViolences);

    // Getting the neccessary queries
    const firstQuery = queries.post.registry(FIRST_TABLE, registerData);
    console.log('POST firstQuery ::: ', firstQuery);

    // Handling the environments to test with mocked data if we are in the dev environment
    if (env.ENV !== 'dev') {
      const db = await conn.connect();

      try {
        // Start the transaction
        await conn.query('START TRANSACTION');

        // Insert the first record
        const firstResult: OkPacket = await conn.query(firstQuery);
        console.log('POST firstResult ::: ', firstResult);

        if (firstResult.affectedRows > 0 && firstResult.insertId) {
          // Insert multiple associated violences
          const associatedViolencesPromises = associatedViolences.map(
            async (associatedViolence) => {
              try {
                const result = (await conn.query(
                  queries.post.registry(SECOND_TABLE, {
                    numero_violencia: firstResult.insertId,
                    cod_violencia_asociada: associatedViolence.value,
                    violencia_asociada: associatedViolence.label,
                  }),
                )) as OkPacket;
                return result;
              } catch (error) {
                // Setting the right error message
                const errorMessage =
                  typeof error === 'string'
                    ? error
                    : error instanceof Error
                      ? error.message
                      : 'Error Unknown';

                console.error(
                  'Database associated violence Error: ',
                  errorMessage,
                );

                return {
                  error: errorMessage,
                  associatedViolence,
                };
              }
            },
          );

          const associatedViolencesResults = await Promise.all(
            associatedViolencesPromises,
          );
          console.log(
            'POST associatedViolencesResults ::: ',
            associatedViolencesResults,
          );

          // Check for errors in the associated violences insertions
          const failedInserts = associatedViolencesResults.filter(
            (result) => result?.error,
          );
          console.log('POST failedInserts ::: ', failedInserts);

          if (failedInserts.length > 0) {
            // Rollback the transaction if any insert failed
            await conn.query('ROLLBACK');
            // return {
            //   success: false,
            //   errors: failedInserts.map((failed) => ({
            //     associatedViolence: failed?.associatedViolence,
            //     error: failed?.error,
            //   })),
            // };

            return NextResponse.json({
              success: false,
              errorMessage:
                'Algo ocurrió al insertar el registro en la base de datos',
              errors: failedInserts.map((failed) => ({
                associatedViolence: failed?.associatedViolence,
                error: failed?.error,
              })),
            });
          }

          // Commit the transaction if all inserts succeeded
          await conn.query('COMMIT');
          // return {
          //   success: true,
          //   message:
          //     'Se insertó el registro y las violencias asociadas exitosamente',
          // };
          return NextResponse.json({
            success: true,
            message:
              'Se insertó el registro y las violencias asociadas exitosamente',
            data,
          });
        } else {
          // Rollback the transaction if the first insert failed
          await conn.query('ROLLBACK');
          // return {
          //   success: false,
          //   errors:
          //     'Se produjo un error al intentar insertar un registro en la base de datos',
          // };

          return NextResponse.json({
            success: false,
            errorMessage:
              'Se produjo un error al intentar insertar un registro en la base de datos',
          });
        }
      } catch (error) {
        // Rollback the transaction on any error
        await conn.query('ROLLBACK');

        // Setting the right error message
        const errorMessage =
          typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : 'Error Unknown';

        console.error('Database Error: ', errorMessage);

        // return {
        //   success: false,
        //   errors: errorMessage,
        // };

        return NextResponse.json({
          success: false,
          errorMessage: errorMessage,
        });
      } finally {
        // Close the connection
        await conn.end();
      }
    } else {
      return NextResponse.json({
        success: true,
        result: {
          firstQuery,
        },
      });
    }
  } else {
    console.error(
      'postFormData failed validation result ::: ',
      validationResult.error.message,
    );
    throw new Error(validationResult.error.message);
  }
}