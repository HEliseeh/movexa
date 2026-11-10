package com.mycompany.myapp.service.dto;

import com.mycompany.myapp.domain.enumeration.Gender;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserDTO {

    private String firstName;
    private String lastName;
    private Integer age;
    private Double weight;
    private Double height;
    private Gender gender;
}
